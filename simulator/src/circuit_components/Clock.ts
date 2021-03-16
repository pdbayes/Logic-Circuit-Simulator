import { LogicInput } from "./LogicInput.js"

export class Clock extends LogicInput {

    private truePeriod: number
    private falsePeriod: number
    private strInfo: string
    private lastTick = new Date().getTime()

    constructor(period: number, dutycycle: number) {
        super()
        this.truePeriod = period * dutycycle / 100
        this.falsePeriod = period * (100 - dutycycle) / 100
        this.strInfo = "CLOCK \nT = " + period + " ms\nD% = " + dutycycle
    }

    draw() {
        const currTick = new Date().getTime()

        const period = (this.value) ? this.truePeriod : this.falsePeriod
        if (currTick - this.lastTick > period) {
            this.toggle()
            this.lastTick = currTick
        }

        super.draw()
    }

    printInfo() {
        noStroke()
        fill(0)
        textSize(12)
        textStyle(NORMAL)
        text(this.strInfo, this.posX - 20, this.posY + 25)
    }
}
