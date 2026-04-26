# Branchlet — Terminal Freeze on Cmd+W (SIGHUP) Investigation

## Symptom

When the `branchlet` TUI is open and the user closes the macOS Terminal tab via `Cmd + W`, the terminal application becomes unresponsive (spinning beach-ball cursor over the window) for 1–3 minutes before the tab finally closes. The freeze does **not** reproduce on `Ctrl + C` — only on Cmd+W (or any other action that triggers a PTY hang-up such as closing the window, force-quitting Terminal, or `kill -HUP` on the shell).

## What Actually Happens on Cmd+W

`Cmd + W` is **not** "send SIGINT". macOS Terminal/iTerm closes the master end of the pseudo-terminal (PTY). The kernel does a `vhangup`:

1. `SIGHUP` is delivered to every process whose controlling terminal is the closed PTY (bash, the `$(...)` subshell, and `branchlet`).
2. Subsequent reads/writes to the PTY slave return `EIO`.
3. macOS Terminal.app's main thread blocks waiting for the PTY's reference count to drop to zero (i.e. all processes that opened the slave PTY release it). While it blocks, the window shows the beach-ball — that's the spinning cursor the user sees.
4. Once every process has released the slave fd, the window is reaped.

So the freeze duration = how long it takes the slowest descendant of bash to release its PTY references. Anything that delays `branchlet`'s teardown directly lengthens the freeze.

## Code Paths Examined

- `src/index.tsx:167-183` — `--from-wrapper` opens `/dev/tty` and gives the resulting streams to Ink.
- `src/index.tsx:204-218` — only `SIGINT` and `SIGTERM` are handled. **No `SIGHUP` handler.**
- `node_modules/ink/build/ink.js:179` — Ink registers an exit listener via `signal-exit`.
- `node_modules/signal-exit/signals.js` — `SIGHUP` is in the list, so signal-exit catches it.
- `node_modules/signal-exit/index.js:120-134` — on a caught signal, signal-exit fires Ink's `unmount`, removes itself, then re-raises the signal so Node's default handler terminates the process.
- `node_modules/ink/build/components/App.js:54-67` — `disableRawMode` calls `stdin.setRawMode(false)`, `detachReadableListener`, and `stdin.unref()` on the Ink stdin (the `/dev/tty` ReadStream).
- `src/services/file-service.ts:180-216` — `openTerminal` spawns a `detached: true`, `unref()`'d child with `stdio: "ignore"`.

## Ranked Possibilities

| Rank | Possibility | Why it fits the symptom | Why it might not |
| ---- | ----------- | ----------------------- | ---------------- |
| 1 | **`fs.openSync("/dev/tty", "r+")` returns a single fd that's wrapped by both `tty.ReadStream` and `tty.WriteStream` (`src/index.tsx:173-175`).** Two libuv handles own the same kernel fd. On SIGHUP, when one stream is destroyed/unref'd, the other still owns the same fd; libuv may retry close/poll operations on a vhungup PTY. The fd is also never explicitly `close()`'d — it leaks into the exit path. While that fd lives, the slave PTY's reference count stays > 0 and Terminal.app keeps spinning. | Strongly explains "process tree is *almost* dead but the PTY isn't reaped" symptom and matches the multi-minute, variable wait (libuv retry/timeout windows). | Hard to confirm without instrumenting libuv; same code shouldn't usually take *minutes*. |
| 2 | **Branchlet has no `SIGHUP` handler (`src/index.tsx:204-218` — only SIGINT/SIGTERM)** so cleanup of the explicitly-opened `/dev/tty` fd is never invoked deliberately. signal-exit's handler unmounts Ink and then `process.kill(pid, "SIGHUP")` re-raises, but Node's default-SIGHUP teardown does not know about the manually-opened fd as anything special — it relies on libuv to clean it. Combined with #1 this is what produces the long tail. | Adding an explicit SIGHUP handler that closes the fd ought to fix or shorten the hang — easy to validate. | Even without an explicit handler, libuv normally still closes fds on exit. |
| 3 | **Ink's `signal-exit` callback writes to `inkStdout` (the `/dev/tty` WriteStream) during `unmount` (`ink.js:419-529`).** `cliCursor.show(stdout)` and the final-frame write target the same vhungup fd. Buffered writes drain into a TTY whose slave end is being torn down — on macOS this can sit in `EIO` retry territory for a while before libuv gives up, especially with the shared fd from #1. | Matches the "macOS Terminal is waiting for me" timing. The write attempts occur during the only window in which the process is still alive. | Once the kernel marks the slave hung-up, writes return `EIO` quickly in the normal case; a single write shouldn't block minutes. |
| 4 | **The bash wrapper runs branchlet inside `$(...)` (`src/services/shell-integration-service.ts:206-215`).** `$(...)` only completes when the captured stdout pipe sees EOF. EOF requires *every* process descended from branchlet to release the write end of the pipe. If any short-lived child (post-create command, terminal-launching shell) was spawned without `stdio: "ignore"` and inherited fd 1, that descendant keeps the pipe alive until it exits — extending the wait that bash, and therefore Terminal.app, must do. | Plausible if the user previously ran "Open with Command" or post-create commands earlier in the session — those use `shell: true` and could fork subprocesses inheriting fds. | The two relevant spawns (`executeCommand`, `openTerminal`) explicitly use `stdio: "pipe"` or `"ignore"`, so the parent's stdout is *not* inherited in the documented cases. |
| 5 | **`process.stdin` (the original fd 0 from the bash subshell) is never `unref`'d.** Ink only unrefs `inkStdin` (the new `/dev/tty` ReadStream), not `process.stdin`. After Ink unmounts but before `process.exit(0)` on Cmd+W path (which doesn't run because there's no SIGHUP handler), the original stdin keeps the libuv loop reffed, so the process exits via signal default rather than naturally — adds latency. | Compounds whatever else is happening; explains why removing one issue might not fully fix it. | A SIGHUP delivered to the process group should still terminate; this is at most a contributor. |
| 6 | **`fetchLatestVersion` (`src/services/update-service.ts:89-110`) may have an in-flight TCP socket when SIGHUP fires.** AbortController only marks the request aborted at the JS level; macOS may not finalize the underlying socket teardown for some seconds. Note this never reaches minutes — included for completeness. | Exists every time a fresh update check runs (>24 h since last check). | The 5 s AbortController timeout caps it; libuv tears the socket down on exit. Doesn't explain minute-scale hangs. |
| 7 | **Detached terminal child from `openTerminal` (`src/services/file-service.ts:197-215`).** Uses `detached: true`, `unref()`, `stdio: "ignore"`. In theory clean, but `shell: true` on macOS forks an intermediate `sh -c` that briefly inherits the controlling tty before `setsid`. | If the user just used "Open with Command" right before Cmd+W, there's a small window where the intermediate shell still has the PTY. | The `unref()` plus `stdio: "ignore"` should make this irrelevant. Doesn't reproduce when the user only browses the menu. |
| 8 | **In-flight git child processes (`src/utils/git-commands.ts:6`)** at the moment of Cmd+W — they share branchlet's process group and receive SIGHUP themselves. | Only if Cmd+W happens during loading/listing. | Git exits immediately on SIGHUP; the parent's awaited promise just rejects. |
| 9 | **Ink's `cliCursor` hide didn't get a paired `show` to flush** — could leave the prompt cursor invisible after recovery, *appearing* frozen. | Subjective: the user described 1–3 min unresponsiveness with a beach-ball. | Beach-ball implies app hang, not invisible cursor. |

## Conclusion

The single most likely root cause is **#1 + #2 acting together**: the `--from-wrapper` flow opens `/dev/tty` once, hands the same fd to two TTY streams, and never explicitly closes it; combined with the absence of a `SIGHUP` handler, branchlet's teardown leaves an unreleased reference to the slave PTY. macOS Terminal.app blocks on PTY reaping until that reference is finally released by the dying process, and that release path (libuv tearing down two stream wrappers around one shared fd on a vhungup PTY) is slow.

## Fix Implemented

In `src/index.tsx`:

1. Open `/dev/tty` **twice** — separate fds for read and write — so neither stream contends for ownership during cleanup.
2. Add a `SIGHUP` handler matching the existing SIGINT/SIGTERM ones.
3. Centralise teardown in a single `cleanupAndExit` routine that:
   - calls Ink's `unmount`
   - explicitly disables raw mode and destroys both Ink streams
   - explicitly `closeSync`s both `/dev/tty` fds
   - then calls `process.exit(code)`
4. `unref()` the original `process.stdin` in `--from-wrapper` mode so it never holds the libuv loop alive after Ink hands its own stdin off.

These changes give the kernel a clean release of every PTY slave reference branchlet ever held, allowing Terminal.app to reap the window immediately when the user does Cmd+W.
