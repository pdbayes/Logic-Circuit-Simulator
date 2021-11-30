import { LogicEditor } from "./LogicEditor"
import { isDefined, isEmpty, isUndefined, nonEmpty, TimeoutHandle } from "./utils"

export type Callback = (theoreticalTime: number) => unknown
export type TimelineState = { hasCallbacks: boolean, isPaused: boolean, canStep: boolean }

function areStatesEqual(s1: TimelineState, s2: TimelineState): boolean {
    return s1.hasCallbacks === s2.hasCallbacks
        && s1.isPaused === s2.isPaused
        && s1.canStep === s2.canStep
}

type ScheduledCallbacks = { [time: number]: [Callback, string][] }

export class Timeline {

    public readonly editor: LogicEditor

    // what in the system time is our zero time (adjusted on pause, reset on reload)
    private _epochStart!: number
    private _sortedNextCallbackTimes!: number[]
    // per callback time, a list of callbacks
    private _schedule!: ScheduledCallbacks
    // allows canceling the next tick if (a) we pause, (b) we enqueue something before
    private _nextTimeoutHandle: TimeoutHandle | undefined
    // when we are paused: the (absolute) start time of the pause
    private _pausedSince: number | undefined
    // remember last sent state to avoid fake events
    private _lastSentState: TimelineState | undefined

    // public callback function
    public onStateChanged: (state: TimelineState) => unknown = __ => null

    public constructor(editor: LogicEditor) {
        this.editor = editor
        this.reset()
    }

    public reset() {
        this._epochStart = this.unadjustedTime()
        this._sortedNextCallbackTimes = []
        this._schedule = {}
        if (isDefined(this._nextTimeoutHandle)) {
            clearTimeout(this._nextTimeoutHandle)
            this._nextTimeoutHandle = undefined
        }
        this._pausedSince = undefined
    }

    public get state(): TimelineState {
        const hasCallbacks = nonEmpty(this._sortedNextCallbackTimes)
        const isPaused = isDefined(this._pausedSince)
        const canStep = isPaused && hasCallbacks
        return { hasCallbacks, isPaused, canStep }
    }

    private unadjustedTime() {
        return new Date().getTime()
    }

    public adjustedTime() {
        if (isDefined(this._pausedSince)) {
            // return constant value of "stuck" time
            return this._pausedSince - this._epochStart
        } else {
            // return absolute time minus when we started to count
            return this.unadjustedTime() - this._epochStart
        }
    }

    public scheduleAt(time: number, desc: string, callback: Callback) {
        if (time < this.adjustedTime()) {
            console.log("ERROR Scheduling this in the past, skipping: " + desc)
            return
        }
        // console.log(`Scheduling '${desc}' at ${time}`)
        if (time in this._schedule) {
            // add callback to existing time
            this._schedule[time].push([callback, desc])

        } else {
            // add new time to sorted list of times
            let i = 0
            do {
                if (i >= this._sortedNextCallbackTimes.length) {
                    // push as last value
                    this._sortedNextCallbackTimes.push(time)
                    break
                }
                if (time < this._sortedNextCallbackTimes[i]) {
                    // insert at position i
                    this._sortedNextCallbackTimes.splice(i, 0, time)
                    break
                }
                i++
                // eslint-disable-next-line no-constant-condition
            } while (true)
            this._schedule[time] = [[callback, desc]]

            if (i === 0) {
                // inserted in front of queue
                this.rescheduleNextIfNeeded()
            }

            this.fireStateChangedIfNeeded()
            // console.log("Schedule: ", this._schedule)
        }
    }

    private rescheduleNextIfNeeded() {
        // schedules a timeout for the next wanted tick time
        if (isDefined(this._nextTimeoutHandle)) {
            clearTimeout(this._nextTimeoutHandle)
        }

        if (nonEmpty(this._sortedNextCallbackTimes)) {
            const tickTime = this._sortedNextCallbackTimes[0]
            const waitDuration = tickTime - this.adjustedTime()
            this._nextTimeoutHandle = setTimeout(
                () => this.nextTickCallback(), waitDuration
            )
        }
    }

    private nextTickCallback() {
        this._nextTimeoutHandle = undefined
        // don't do anything if this was called while we are paused
        if (isDefined(this._pausedSince)) {
            return
        }
        this.handleNextTick()
    }

    private handleNextTick() {
        // run all the handlers from the next tick
        const wantedTime = this._sortedNextCallbackTimes.shift() ?? -1
        if (wantedTime === -1) {
            return
        }
        const callbacks = this._schedule[wantedTime]
        delete this._schedule[wantedTime]

        const runCallback = () => {
            // console.log(`Running ${callbacks.length} callbacks at real time ${this.adjustedTime()} (wanted for ${wantedTime})`)
            for (const [callback, desc] of callbacks) {
                // console.log(`  -> Running '${desc}'`)
                try {
                    callback(wantedTime)
                } catch (err) {
                    console.log(`ERROR running callback '${desc}': ` + err)
                }
            }
        }

        // use wrapHandler to do any recalc/redraws after
        // calling the handlers if necessary
        this.editor.wrapHandler(runCallback)()

        // move on to the next tick
        this.rescheduleNextIfNeeded()
        this.fireStateChangedIfNeeded()
    }

    public pause() {
        if (isDefined(this._pausedSince)) {
            return
        }
        if (isDefined(this._nextTimeoutHandle)) {
            clearTimeout(this._nextTimeoutHandle)
        }
        this._pausedSince = this.unadjustedTime()
        this.fireStateChangedIfNeeded()
    }

    public play() {
        if (isUndefined(this._pausedSince)) {
            return
        }
        this._epochStart += (this.unadjustedTime() - this._pausedSince)
        this._pausedSince = undefined
        this.rescheduleNextIfNeeded()
        this.fireStateChangedIfNeeded()
    }

    public step() {
        if (isUndefined(this._pausedSince) || isEmpty(this._sortedNextCallbackTimes)) {
            return
        }
        // move back epoch start time to simulate that the time
        // between now and the next tick has been elapsed
        const nextTickTime = this._sortedNextCallbackTimes[0]
        const currentPauseTime = this.adjustedTime()
        this._epochStart -= nextTickTime - currentPauseTime
        this.handleNextTick()
        this.fireStateChangedIfNeeded()
    }

    private fireStateChangedIfNeeded() {
        const newState = this.state
        if (isUndefined(this._lastSentState) || !areStatesEqual(this._lastSentState, newState)) {
            this.onStateChanged(newState)
            this._lastSentState = newState
        }
    }
}
