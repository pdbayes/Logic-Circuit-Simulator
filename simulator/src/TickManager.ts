import { currentEpochTime, wrapHandler } from "./simulator"
import { isDefined, isEmpty } from "./utils"

export type Callback = (theoreticalTime: number) => unknown

export const TickManager = (() => {
    type ScheduledCallbacks = { [time: number]: [Callback, string][] }

    const _sortedNextCallbackTimes: number[] = []
    const _schedule: ScheduledCallbacks = {}
    let _nextTimeout: number | undefined

    function rescheduleNextIfNeeded() {
        if (isDefined(_nextTimeout)) {
            clearTimeout(_nextTimeout)
        }

        if (!isEmpty(_sortedNextCallbackTimes)) {
            const time = _sortedNextCallbackTimes[0]
            _nextTimeout = setTimeout(handleTimeout, time - currentEpochTime())
        }
    }

    function handleTimeout() {
        const wantedTime = _sortedNextCallbackTimes.shift() ?? -1
        _nextTimeout = undefined
        const callbacks = _schedule[wantedTime]
        delete _schedule[wantedTime]

        function runCallback() {
            // console.log(`Running ${callbacks.length} callbacks at real time ${currentEpochTime()} (wanted for ${wantedTime})`)
            for (const [callback, desc] of callbacks) {
                // console.log(`  -> Running '${desc}'`)
                try {
                    callback(wantedTime)
                } catch (err) {
                    console.log(`ERROR running callback '${desc}': ` + err)
                }
            }
        }

        wrapHandler(runCallback)()
        rescheduleNextIfNeeded()
    }

    return {
        scheduleAt(time: number, desc: string, callback: Callback) {
            if (time < currentEpochTime()) {
                console.log("ERROR Scheduling this in the past, skipping: " + desc)
                return
            }
            // console.log(`Scheduling '${desc}' at ${time}`)
            if (time in _schedule) {
                // add callback to existing time
                _schedule[time].push([callback, desc])

            } else {
                // add new time to sorted list of times
                let i = 0
                do {
                    if (i >= _sortedNextCallbackTimes.length) {
                        // push as last value
                        _sortedNextCallbackTimes.push(time)
                        break
                    }
                    if (time < _sortedNextCallbackTimes[i]) {
                        _sortedNextCallbackTimes.splice(i, 0, time)
                        break
                    }
                    i++
                    // eslint-disable-next-line no-constant-condition
                } while (true)
                _schedule[time] = [[callback, desc]]

                if (i === 0) {
                    // inserted in front of queue
                    rescheduleNextIfNeeded()
                }

                // console.log("Schedule: ", _schedule)
            }
        },
    }
})()
