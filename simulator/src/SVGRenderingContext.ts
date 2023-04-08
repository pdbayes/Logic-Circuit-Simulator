/* eslint-disable prefer-named-capture-group */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */

/*
 *  This is a TypeScript port of canvas2svg a.k.a svgcanvas
 *
 * Original by https://github.com/gliffy/canvas2svg
 * Updated by https://github.com/zenozeng/svgcanvas
 * Improved by https://github.com/aha-app/svgcanvas
 *
 *  Licensed under the MIT license:
 *  http://www.opensource.org/licenses/mit-license.php
 */

import { isDefined, isString, isUndefined } from "./utils"


//helper function that generates a random string
function randomString(holder?: Record<string, unknown>) {
    if (!holder) {
        throw new Error("cannot create a random attribute name for an undefined object")
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
    let randomstring = ""
    do {
        randomstring = ""
        for (let i = 0; i < 12; i++) {
            randomstring += chars[Math.floor(Math.random() * chars.length)]
        }
    } while (holder[randomstring])
    return randomstring
}

//helper function to map named to numbered entities
function createNamedToNumberedLookup(itemsStr: string, radix?: number) {
    const lookup: Record<string, string> = {}
    const items = itemsStr.split(',')
    radix = radix ?? 10
    // Map from named to numbered entities.
    for (let i = 0; i < items.length; i += 2) {
        const entity = '&' + items[i + 1] + ';'
        const base10 = parseInt(items[i], radix)
        lookup[entity] = '&#' + base10 + ';'
    }
    //FF and IE need to create a regex from hex values ie &nbsp; == \xa0
    lookup["\\xa0"] = '&#160;'
    return lookup
}

//helper function to map canvas-textAlign to svg-textAnchor
function getTextAnchor(textAlign: string) {
    //TODO: support rtl languages
    const mapping: Record<string, string> = { "left": "start", "right": "end", "center": "middle", "start": "start", "end": "end" }
    return mapping[textAlign] || mapping.start
}

//helper function to map canvas-textBaseline to svg-dominantBaseline
function getDominantBaseline(textBaseline: string) {
    //INFO: not supported in all browsers
    const mapping: Record<string, string> = { "alphabetic": "alphabetic", "hanging": "hanging", "top": "text-before-edge", "bottom": "text-after-edge", "middle": "central" }
    return mapping[textBaseline] ?? mapping.alphabetic
}

// Unpack entities lookup where the numbers are in radix 32 to reduce the size
// entity mapping courtesy of tinymce
export const namedEntities = createNamedToNumberedLookup(
    '50,nbsp,51,iexcl,52,cent,53,pound,54,curren,55,yen,56,brvbar,57,sect,58,uml,59,copy,' +
    '5a,ordf,5b,laquo,5c,not,5d,shy,5e,reg,5f,macr,5g,deg,5h,plusmn,5i,sup2,5j,sup3,5k,acute,' +
    '5l,micro,5m,para,5n,middot,5o,cedil,5p,sup1,5q,ordm,5r,raquo,5s,frac14,5t,frac12,5u,frac34,' +
    '5v,iquest,60,Agrave,61,Aacute,62,Acirc,63,Atilde,64,Auml,65,Aring,66,AElig,67,Ccedil,' +
    '68,Egrave,69,Eacute,6a,Ecirc,6b,Euml,6c,Igrave,6d,Iacute,6e,Icirc,6f,Iuml,6g,ETH,6h,Ntilde,' +
    '6i,Ograve,6j,Oacute,6k,Ocirc,6l,Otilde,6m,Ouml,6n,times,6o,Oslash,6p,Ugrave,6q,Uacute,' +
    '6r,Ucirc,6s,Uuml,6t,Yacute,6u,THORN,6v,szlig,70,agrave,71,aacute,72,acirc,73,atilde,74,auml,' +
    '75,aring,76,aelig,77,ccedil,78,egrave,79,eacute,7a,ecirc,7b,euml,7c,igrave,7d,iacute,7e,icirc,' +
    '7f,iuml,7g,eth,7h,ntilde,7i,ograve,7j,oacute,7k,ocirc,7l,otilde,7m,ouml,7n,divide,7o,oslash,' +
    '7p,ugrave,7q,uacute,7r,ucirc,7s,uuml,7t,yacute,7u,thorn,7v,yuml,ci,fnof,sh,Alpha,si,Beta,' +
    'sj,Gamma,sk,Delta,sl,Epsilon,sm,Zeta,sn,Eta,so,Theta,sp,Iota,sq,Kappa,sr,Lambda,ss,Mu,' +
    'st,Nu,su,Xi,sv,Omicron,t0,Pi,t1,Rho,t3,Sigma,t4,Tau,t5,Upsilon,t6,Phi,t7,Chi,t8,Psi,' +
    't9,Omega,th,alpha,ti,beta,tj,gamma,tk,delta,tl,epsilon,tm,zeta,tn,eta,to,theta,tp,iota,' +
    'tq,kappa,tr,lambda,ts,mu,tt,nu,tu,xi,tv,omicron,u0,pi,u1,rho,u2,sigmaf,u3,sigma,u4,tau,' +
    'u5,upsilon,u6,phi,u7,chi,u8,psi,u9,omega,uh,thetasym,ui,upsih,um,piv,812,bull,816,hellip,' +
    '81i,prime,81j,Prime,81u,oline,824,frasl,88o,weierp,88h,image,88s,real,892,trade,89l,alefsym,' +
    '8cg,larr,8ch,uarr,8ci,rarr,8cj,darr,8ck,harr,8dl,crarr,8eg,lArr,8eh,uArr,8ei,rArr,8ej,dArr,' +
    '8ek,hArr,8g0,forall,8g2,part,8g3,exist,8g5,empty,8g7,nabla,8g8,isin,8g9,notin,8gb,ni,8gf,prod,' +
    '8gh,sum,8gi,minus,8gn,lowast,8gq,radic,8gt,prop,8gu,infin,8h0,ang,8h7,and,8h8,or,8h9,cap,8ha,cup,' +
    '8hb,int,8hk,there4,8hs,sim,8i5,cong,8i8,asymp,8j0,ne,8j1,equiv,8j4,le,8j5,ge,8k2,sub,8k3,sup,8k4,' +
    'nsub,8k6,sube,8k7,supe,8kl,oplus,8kn,otimes,8l5,perp,8m5,sdot,8o8,lceil,8o9,rceil,8oa,lfloor,8ob,' +
    'rfloor,8p9,lang,8pa,rang,9ea,loz,9j0,spades,9j3,clubs,9j5,hearts,9j6,diams,ai,OElig,aj,oelig,b0,' +
    'Scaron,b1,scaron,bo,Yuml,m6,circ,ms,tilde,802,ensp,803,emsp,809,thinsp,80c,zwnj,80d,zwj,80e,lrm,' +
    '80f,rlm,80j,ndash,80k,mdash,80o,lsquo,80p,rsquo,80q,sbquo,80s,ldquo,80t,rdquo,80u,bdquo,810,dagger,' +
    '811,Dagger,81g,permil,81p,lsaquo,81q,rsaquo,85c,euro', 32)


//Some basic mappings for attributes and default values.
const STYLES = {
    "strokeStyle": {
        svgAttr: "stroke",
        svg: "none",
        apply: "stroke",
    },
    "fillStyle": {
        svgAttr: "fill",
        svg: null, //svg default is black, but we need to special case this to handle canvas stroke without fill
        apply: "fill",
    },
    "lineCap": {
        svgAttr: "stroke-linecap",
        svg: "butt",
        apply: "stroke",
    },
    "lineJoin": {
        svgAttr: "stroke-linejoin",
        svg: "miter",
        apply: "stroke",
    },
    "miterLimit": {
        svgAttr: "stroke-miterlimit",
        svg: 4,
        apply: "stroke",
    },
    "lineWidth": {
        svgAttr: "stroke-width",
        svg: 1,
        apply: "stroke",
    },
    "globalAlpha": {
        svgAttr: "opacity",
        svg: 1,
        apply: "fill stroke",
    },
    "lineDash": {
        svgAttr: "stroke-dasharray",
        svg: null,
        apply: "stroke",
    },
} satisfies Record<string, {
    svgAttr?: string, //corresponding svg attribute
    svg?: string | number | null,       //svg default
    apply?: string,    //apply on stroke() or fill()
}>

class CanvasGradientSVG implements CanvasGradient {

    public __root: SVGGradientElement
    public __ctx: SVGRenderingContext

    /**
    *
    * @param gradientNode - reference to the gradient
    * @constructor
    */
    constructor(gradientNode: SVGGradientElement, ctx: SVGRenderingContext) {
        this.__root = gradientNode
        this.__ctx = ctx
    }

    /**
    * Adds a color stop to the gradient root
    */
    addColorStop(offset: number, color: string) {
        const stop = this.__ctx.__createElement("stop")
        stop.setAttribute("offset", String(offset))
        if (color.indexOf("rgba") !== -1) {
            //separate alpha value, since webkit can't handle it
            // eslint-disable-next-line prefer-named-capture-group
            const regex = /rgba\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi
            const matches = regex.exec(color)
            if (matches) {
                stop.setAttribute("stop-color", `rgb(${matches[1]},${matches[2]},${matches[3]})`)
                stop.setAttribute("stop-opacity", matches[4])
            } else {
                stop.setAttribute("stop-color", color)
            }
        } else {
            stop.setAttribute("stop-color", color)
        }
        this.__root.appendChild(stop)
    }
}

class CanvasPatternSVG {
    constructor(public __root: SVGElement, public __ctx: SVGRenderingContext) { }
}


type ContextOptions = {
    width: number
    height: number
    enableMirroring: boolean
    document: Document
    ctx: CanvasRenderingContext2D
    debug: boolean
}

const defaultOptions = { width: 500, height: 500, enableMirroring: false } satisfies Partial<ContextOptions>

export class SVGRenderingContext {

    width: number
    height: number
    enableMirroring: boolean
    canvas: SVGRenderingContext

    strokeStyle: string = "#000000"
    fillStyle: string = "#000000"
    lineCap: string = "butt"
    lineJoin: string = "miter"
    miterLimit: number = 10
    lineWidth: number = 1
    globalAlpha: number = 1
    font: string = "10px sans-serif"
    shadowColor: string = "#000000"
    shadowOffsetX: number = 0
    shadowOffsetY: number = 0
    shadowBlur: number = 0
    textAlign: string = "start"
    textBaseline: string = "alphabetic"
    lineDash: string | null = null

    __id: string
    __document: Document
    __canvas: HTMLCanvasElement | undefined
    __ctx: CanvasRenderingContext2D
    __root: SVGSVGElement
    __defs: SVGDefsElement
    __currentElement: SVGElement
    __currentElementsToStyle: null = null
    __styleStack: Record<string, string>[]
    __groupStack: SVGElement[]
    __options: Partial<ContextOptions>
    __ids: Record<string, unknown>
    __transformMatrix: DOMMatrix = new DOMMatrix()
    __transformMatrixStack: DOMMatrix[] | undefined
    __fontHref: string | undefined
    __fontUnderline: string = ""
    __currentDefaultPath: Path2DSVG = new Path2DSVG(this)
    __currentPosition: { x?: number, y?: number } = {}


    /**
     * The mock canvas context
     * @param o - options include:
     * ctx - existing Context2D to wrap around
     * width - width of your canvas (defaults to 500)
     * height - height of your canvas (defaults to 500)
     * enableMirroring - enables canvas mirroring (get image data) (defaults to false)
     * document - the document object (defaults to the current document)
     */
    constructor(options?: Partial<ContextOptions>) {

        // keep support for this way of calling Context: new Context(width, height)
        if (arguments.length > 1) {
            options = defaultOptions
            // eslint-disable-next-line prefer-rest-params
            options.width = arguments[0]
            // eslint-disable-next-line prefer-rest-params
            options.height = arguments[1]
        } else if (!options) {
            options = defaultOptions
        }

        //setup options
        this.width = options.width ?? defaultOptions.width
        this.height = options.height ?? defaultOptions.height
        this.enableMirroring = options.enableMirroring !== undefined ? options.enableMirroring : defaultOptions.enableMirroring

        this.canvas = this   ///point back to this instance!
        this.__document = options.document || document

        // allow passing in an existing context to wrap around
        // if a context is passed in, we know a canvas already exist
        if (options.ctx) {
            this.__ctx = options.ctx
        } else {
            this.__canvas = this.__document.createElement("canvas")
            this.__ctx = this.__canvas.getContext("2d")!
        }

        this.__styleStack = [this.__getStyleState()]
        this.__groupStack = []

        //the root svg element
        this.__root = this.__document.createElementNS("http://www.w3.org/2000/svg", "svg")
        this.__root.setAttribute("version", "1.1")
        this.__root.setAttribute("xmlns", "http://www.w3.org/2000/svg")
        this.__root.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink")
        this.__root.setAttribute("width", String(this.width))
        this.__root.setAttribute("height", String(this.height))

        //make sure we don't generate the same ids in defs
        this.__ids = {}

        //defs tag
        this.__defs = this.__document.createElementNS("http://www.w3.org/2000/svg", "defs")
        this.__root.appendChild(this.__defs)

        //also add a group child. the svg element can't use the transform attribute
        this.__currentElement = this.__document.createElementNS("http://www.w3.org/2000/svg", "g")
        this.__root.appendChild(this.__currentElement)

        // init transformation matrix
        this.resetTransform()

        this.__options = options
        this.__id = Math.random().toString(16).substring(2, 8)
        this.__debug(`new`, options)
    }

    private __debug(...data: unknown[]) {
        if (!(this.__options.debug ?? false)) {
            return
        }
        console.debug(`svgcanvas#${this.__id}:`, ...data)
    }

    __createElement<K extends keyof SVGElementTagNameMap>(elementName: K, properties?: Record<string, string | number>, resetFill?: boolean): SVGElementTagNameMap[K] {
        if (typeof properties === "undefined") {
            properties = {}
        }

        const element = this.__document.createElementNS("http://www.w3.org/2000/svg", elementName)
        const keys = Object.keys(properties)
        if (resetFill ?? false) {
            //if fill or stroke is not specified, the svg element should not display. By default SVG's fill is black.
            element.setAttribute("fill", "none")
            element.setAttribute("stroke", "none")
        }
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            element.setAttribute(key, String(properties[key]))
        }
        return element
    }

    // [key: keyof typeof STYLES]: any

    /**
     * Will return the closest group or svg node. May return the current element.
     * @private
     */
    __closestGroupOrSvg(node?: SVGElement | null): SVGElement {
        node = node ?? this.__currentElement
        if (node.nodeName === "g" || node.nodeName === "svg") {
            return node
        } else {
            return this.__closestGroupOrSvg(node.parentNode as SVGElement | null)
        }
    }


    /**
     * Applies styles on restore
     * @param styleState
     * @private
     */
    __applyStyleState(styleState: Record<string, string>) {
        for (const [key, value] of Object.entries(styleState)) {
            (this as any)[key] = value
        }
    }


    /**
     * Gets the current style state
     * @return {Object}
     * @private
     */
    __getStyleState() {
        const styleState: Record<string, string> = {}
        const keys = Object.keys(STYLES)
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            styleState[key] = (this as any)[key]
        }
        return styleState
    }

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
     */
    __applyTransformation(element: SVGElement, matrix?: DOMMatrix) {
        const { a, b, c, d, e, f } = matrix ?? this.getTransform()
        element.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`)
    }

    /**
     * Apples the current styles to the current SVG element. On "ctx.fill" or "ctx.stroke"
     * @param type
     * @private
     */
    __applyStyleToElement(path: SVGElement, type: "fill" | "stroke") {
        const currentElement = path
        const currentStyleGroup = this.__currentElementsToStyle
        if (currentStyleGroup) {
            console.warn("shoud process currentStyleGroup according to temporarily removed code below")
            // currentElement.setAttribute(type, "")
            // currentElement = currentStyleGroup.element
            // currentStyleGroup.children.forEach(function (node) {
            //     node.setAttribute(type, "")
            // })
        }

        for (const [key, style] of Object.entries(STYLES)) {
            let value = (this as any)[key]
            if ("apply" in style && style.apply) {
                //is this a gradient or pattern?
                if (value instanceof CanvasPatternSVG) {
                    //pattern
                    if (value.__ctx) {
                        //copy over defs
                        for (let nodeIndex = 0; nodeIndex < value.__ctx.__defs.childNodes.length; nodeIndex++) {
                            const node = value.__ctx.__defs.childNodes[nodeIndex] as Element
                            const id = node.getAttribute("id")!
                            this.__ids[id] = id
                            this.__defs.appendChild(node)
                        }
                    }
                    currentElement.setAttribute(style.apply, `url(#${value.__root.getAttribute("id")})`)
                }
                else if (value instanceof CanvasGradientSVG) {
                    //gradient
                    currentElement.setAttribute(style.apply, `url(#${value.__root.getAttribute("id")})`)
                } else if (style.apply.indexOf(type) !== -1 && style.svg !== value) {
                    if ((style.svgAttr === "stroke" || style.svgAttr === "fill") && value.indexOf("rgba") !== -1) {
                        //separate alpha value, since illustrator can't handle it
                        const regex = /rgba\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi
                        const matches = regex.exec(value)!
                        currentElement.setAttribute(style.svgAttr, `rgb(${matches[1]},${matches[2]},${matches[3]})`)
                        //should take globalAlpha here
                        const opacity = parseFloat(matches[4]) * this.globalAlpha
                        currentElement.setAttribute(style.svgAttr + "-opacity", String(opacity))
                    } else {
                        let attr = style.svgAttr
                        if (key === 'globalAlpha') {
                            attr = type + '-' + style.svgAttr
                            if (currentElement.getAttribute(attr)) {
                                //fill-opacity or stroke-opacity has already been set by stroke or fill.
                                continue
                            }
                        } else if (key === 'lineWidth') {
                            const scale = this.__getTransformScale()
                            value = value * Math.max(scale.x, scale.y) // TODO error here?
                        }
                        //otherwise only update attribute if right type, and not svg default
                        currentElement.setAttribute(attr, value)
                    }
                }
            }
        }
    }

    /**
     * Returns the serialized value of the svg so far
     * @param fixNamedEntities - Standalone SVG doesn't support named entities, which document.createTextNode encodes.
     *                           If true, we attempt to find all named entities and encode it as a numeric entity.
     * @return serialized svg
     */
    getSerializedSvg(fixNamedEntities?: Record<string, string>) {
        let serialized = new XMLSerializer().serializeToString(this.__root)

        //IE search for a duplicate xmnls because they didn't implement setAttributeNS correctly
        const xmlns = /xmlns="http:\/\/www\.w3\.org\/2000\/svg".+xmlns="http:\/\/www\.w3\.org\/2000\/svg/gi
        if (xmlns.test(serialized)) {
            serialized = serialized.replace('xmlns="http://www.w3.org/2000/svg', 'xmlns:xlink="http://www.w3.org/1999/xlink')
        }

        if (fixNamedEntities) {
            for (const [key, value] of Object.entries(fixNamedEntities)) {
                const regexp = new RegExp(key, "gi")
                if (regexp.test(serialized)) {
                    serialized = serialized.replace(regexp, value)
                }
            }
        }

        return serialized
    }

    /**
     * Returns the root svg
     * @return
     */
    getSvg() {
        return this.__root
    }

    /**
     * Will generate a group tag.
     */
    save() {
        const group = this.__createElement("g")
        const parent = this.__closestGroupOrSvg()
        this.__groupStack.push(parent)
        parent.appendChild(group)
        this.__currentElement = group
        const style = this.__getStyleState()

        this.__debug('save style', style)
        this.__styleStack.push(style)
        if (!this.__transformMatrixStack) {
            this.__transformMatrixStack = []
        }
        this.__transformMatrixStack.push(this.getTransform())
    }

    /**
     * Sets current element to parent, or just root if already root
     */
    restore() {
        this.__currentElement = this.__groupStack.pop()!
        this.__currentElementsToStyle = null
        //Clearing canvas will make the poped group invalid, currentElement is set to the root group node.
        if (!this.__currentElement) {
            this.__currentElement = this.__root.childNodes[1] as SVGElement
        }
        const state = this.__styleStack.pop()!
        this.__debug('restore style', state)
        this.__applyStyleState(state)
        if (this.__transformMatrixStack && this.__transformMatrixStack.length > 0) {
            this.setTransform(this.__transformMatrixStack.pop()!)
        }
    }

    __createPathElement(): SVGPathElement {
        const path = this.__createElement("path", {}, true)
        const parent = this.__closestGroupOrSvg()
        parent.appendChild(path)
        return path
    }

    /**
     * Create a new Path Element
     */
    beginPath() {
        // Note that there is only one current default path, it is not part of the drawing state.
        // See also: https://html.spec.whatwg.org/multipage/scripting.html#current-default-path
        this.__currentDefaultPath = new Path2DSVG(this)
        this.__currentPosition = {}
    }

    /**
     * Closes the current path
     */
    closePath() {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.closePath()
    }

    /**
     * Adds the move command to the current path element,
     * if the currentPathElement is not empty create a new path element
     */
    moveTo(x: number, y: number) {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.moveTo(x, y)
    }

    /**
     * Adds a line to command
     */
    lineTo(x: number, y: number) {
        if (!this.__currentDefaultPath) {
            this.moveTo(x, y)
        }
        this.__currentDefaultPath.lineTo(x, y)
    }

    /**
     *  Adds a rectangle to the path.
     */
    rect(x: number, y: number, width: number, height: number) {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.rect(x, y, width, height)
    }

    /**
     * Add a bezier command
     */
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
    }

    /**
     * Adds a quadratic curve to command
     */
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.quadraticCurveTo(cpx, cpy, x, y)
    }

    /**
     *  Arc command!
     */
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterClockwise: boolean = false) {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.arc(
            x,
            y,
            radius,
            startAngle,
            endAngle,
            counterClockwise
        )
    }


    /**
     * Adds the arcTo to the current path
     *
     * @see http://www.w3.org/TR/2015/WD-2dcontext-20150514/#dom-context-2d-arcto
     */
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number) {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.arcTo(x1, y1, x2, y2, radius)
    }



    /**
     * Sets the stroke property on the current element
     */
    stroke(path2d?: Path2D) {
        this.__strokeOrFill("stroke", path2d)
    }

    /**
     * Sets fill properties on the current element
     */
    fill(path2d?: Path2D) {
        this.__strokeOrFill("fill", path2d)
    }

    __strokeOrFill(action: "stroke" | "fill", path2d?: Path2D) {
        let path: Path2DSVG

        if (path2d) {
            if (!(path2d instanceof Path2DSVG)) {
                throw new Error("Path2D is not a Path2DSVG")
            }
            path = path2d
        } else {
            if (!this.__currentDefaultPath) {
                this.beginPath()
            }
            path = this.__currentDefaultPath
        }

        const pathElement = this.__createPathElement()
        this.__applyStyleToElement(pathElement, action)
        pathElement.setAttribute("paint-order", "fill stroke markers")
        pathElement.setAttribute("d", path.d)
        if (path2d) {
            this.__applyTransformation(pathElement)
        }
    }


    /**
     * adds a rectangle element
     */
    fillRect(x: number, y: number, width: number, height: number) {
        const { a, b, c, d, e, f } = this.getTransform()
        if (JSON.stringify([a, b, c, d, e, f]) === JSON.stringify([1, 0, 0, 1, 0, 0])) {
            //clear entire canvas
            if (x === 0 && y === 0 && width === this.width && height === this.height) {
                this.__clearCanvas()
            }
        }
        const rect = this.__createElement("rect", {
            x: x,
            y: y,
            width: width,
            height: height,
        }, true)
        const parent = this.__closestGroupOrSvg()
        parent.appendChild(rect)
        this.__currentElement = rect
        this.__applyTransformation(rect)
        this.__applyStyleToElement(this.__currentElement, "fill")
    }

    /**
     * Draws a rectangle with no fill
     * @param x
     * @param y
     * @param width
     * @param height
     */
    strokeRect(x: number, y: number, width: number, height: number) {
        const rect = this.__createElement("rect", {
            x: x,
            y: y,
            width: width,
            height: height,
        }, true)
        const parent = this.__closestGroupOrSvg()
        parent.appendChild(rect)
        this.__currentElement = rect
        this.__applyTransformation(rect)
        this.__applyStyleToElement(this.__currentElement, "stroke")
    }


    /**
     * Clear entire canvas:
     * 1. save current transforms
     * 2. remove all the childNodes of the root g element
     */
    __clearCanvas() {
        const rootGroup = this.__root.childNodes[1]
        this.__root.removeChild(rootGroup)
        this.__currentElement = this.__document.createElementNS("http://www.w3.org/2000/svg", "g")
        this.__root.appendChild(this.__currentElement)
        //reset __groupStack as all the child group nodes are all removed.
        this.__groupStack = []
    }

    /**
     * "Clears" a canvas by just drawing a white rectangle in the current group.
     */
    clearRect(x: number, y: number, width: number, height: number) {
        const { a, b, c, d, e, f } = this.getTransform()
        if (JSON.stringify([a, b, c, d, e, f]) === JSON.stringify([1, 0, 0, 1, 0, 0])) {
            //clear entire canvas
            if (x === 0 && y === 0 && width === this.width && height === this.height) {
                this.__clearCanvas()
                return
            }
        }
        const parent = this.__closestGroupOrSvg()
        const rect = this.__createElement("rect", {
            x: x,
            y: y,
            width: width,
            height: height,
            fill: "#FFFFFF",
        }, true)
        this.__applyTransformation(rect)
        parent.appendChild(rect)
    }

    /**
     * Adds a linear gradient to a defs tag.
     * Returns a canvas gradient object that has a reference to it's parent def
     */
    createLinearGradient(x1: number, y1: number, x2: number, y2: number) {
        const grad = this.__createElement("linearGradient", {
            id: randomString(this.__ids),
            x1: x1 + "px",
            x2: x2 + "px",
            y1: y1 + "px",
            y2: y2 + "px",
            "gradientUnits": "userSpaceOnUse",
        }, false)
        this.__defs.appendChild(grad)
        return new CanvasGradientSVG(grad, this)
    }

    /**
     * Adds a radial gradient to a defs tag.
     * Returns a canvas gradient object that has a reference to it's parent def
     */
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
        const grad = this.__createElement("radialGradient", {
            id: randomString(this.__ids),
            cx: x1 + "px",
            cy: y1 + "px",
            r: r1 + "px",
            fx: x0 + "px",
            fy: y0 + "px",
            "gradientUnits": "userSpaceOnUse",
        }, false)
        this.__defs.appendChild(grad)
        return new CanvasGradientSVG(grad, this)

    }

    /**
     * Fills or strokes text
     * @param text
     * @param x
     * @param y
     * @param action - stroke or fill
     * @private
     */
    __applyText(text: string, x: number, y: number, action: "fill" | "stroke") {
        const el = document.createElement("span")
        el.setAttribute("style", 'font:' + this.font)

        const style = el.style
        const parent = this.__closestGroupOrSvg()
        const textElement = this.__createElement("text", {
            "font-family": style.fontFamily,
            "font-size": style.fontSize,
            "font-style": style.fontStyle,
            "font-weight": style.fontWeight,

            // canvas doesn't support underline natively, but we do :)
            "text-decoration": this.__fontUnderline,
            "x": x,
            "y": y,
            "text-anchor": getTextAnchor(this.textAlign),
            "dominant-baseline": getDominantBaseline(this.textBaseline),
        }, true)

        textElement.appendChild(this.__document.createTextNode(text))
        this.__currentElement = textElement
        this.__applyTransformation(textElement)
        this.__applyStyleToElement(this.__currentElement, action)

        if (this.__fontHref) {
            const a = this.__createElement("a")
            // canvas doesn't natively support linking, but we do :)
            a.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", this.__fontHref)
            a.appendChild(textElement)
            parent.appendChild(a)
        } else {
            parent.appendChild(textElement)
        }
    }

    /**
     * Creates a text element
     * @param text
     * @param x
     * @param y
     */
    fillText(text: string, x: number, y: number) {
        this.__applyText(text, x, y, "fill")
    }

    /**
     * Strokes text
     * @param text
     * @param x
     * @param y
     */
    strokeText(text: string, x: number, y: number) {
        this.__applyText(text, x, y, "stroke")
    }

    /**
     * No need to implement this for svg.
     * @param text
     * @return {TextMetrics}
     */
    measureText(text: string) {
        this.__ctx.font = this.font
        return this.__ctx.measureText(text)
    }

    /**
     *  Ellipse command!
     */
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterClockwise = false) {
        if (!this.__currentDefaultPath) {
            this.beginPath()
        }
        this.__currentDefaultPath.ellipse(
            x,
            y,
            radiusX,
            radiusY,
            rotation,
            startAngle,
            endAngle,
            counterClockwise
        )
    }

    /**
     * Generates a ClipPath from the clip command.
     */
    clip(fillRule?: string) {
        const group = this.__closestGroupOrSvg()
        const clipPath = this.__createElement("clipPath")
        const id = randomString(this.__ids)

        const pathElement = this.__createPathElement()
        pathElement.setAttribute("d", this.__currentDefaultPath.d)
        // this.__applyTransformation(pathElement);

        clipPath.setAttribute("id", id)

        if (isDefined(fillRule)) {
            clipPath.setAttribute("clip-rule", fillRule)
        }

        clipPath.appendChild(pathElement)

        this.__defs.appendChild(clipPath)

        //set the clip path to this group
        group.setAttribute("clip-path", `url(#${id})`)

        this.__currentElement = group
    }

    /**
     * Draws a canvas, image or mock context to this canvas.
     * Note that all svg dom manipulation uses node.childNodes rather than node.children for IE support.
     * http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-context-2d-drawimage
     */
    drawImage() {
        //convert arguments to a real array
        // eslint-disable-next-line prefer-rest-params
        const args = Array.prototype.slice.call(arguments)
        let image = args[0]
        let dx, dy, dw, dh, sx = 0, sy = 0, sw, sh, svg, defs, group,
            svgImage, canvas, context

        if (args.length === 3) {
            dx = args[1]
            dy = args[2]
            sw = image.width
            sh = image.height
            dw = sw
            dh = sh
        } else if (args.length === 5) {
            dx = args[1]
            dy = args[2]
            dw = args[3]
            dh = args[4]
            sw = image.width
            sh = image.height
        } else if (args.length === 9) {
            sx = args[1]
            sy = args[2]
            sw = args[3]
            sh = args[4]
            dx = args[5]
            dy = args[6]
            dw = args[7]
            dh = args[8]
        } else {
            throw new Error("Invalid number of arguments passed to drawImage: " + arguments.length)
        }

        const parent = this.__closestGroupOrSvg()
        const matrix = this.getTransform().translate(dx, dy)
        if (image instanceof SVGRenderingContext) {
            //canvas2svg mock canvas context. In the future we may want to clone nodes instead.
            //also I'm currently ignoring dw, dh, sw, sh, sx, sy for a mock context.
            svg = image.getSvg().cloneNode(true)
            if (svg.childNodes && svg.childNodes.length > 1) {
                defs = svg.childNodes[0]
                while (defs.childNodes.length) {
                    const id = (defs.childNodes[0] as Element).getAttribute("id")!
                    this.__ids[id] = id
                    this.__defs.appendChild(defs.childNodes[0])
                }
                group = svg.childNodes[1] as SVGElement
                if (group) {
                    this.__applyTransformation(group, matrix)
                    parent.appendChild(group)
                }
            }
        } else if (image.nodeName === "CANVAS" || image.nodeName === "IMG") {
            //canvas or image
            svgImage = this.__createElement("image")
            svgImage.setAttribute("width", dw)
            svgImage.setAttribute("height", dh)
            svgImage.setAttribute("preserveAspectRatio", "none")

            if (sx || sy || sw !== image.width || sh !== image.height) {
                //crop the image using a temporary canvas
                canvas = this.__document.createElement("canvas")
                canvas.width = dw
                canvas.height = dh
                context = canvas.getContext("2d")!
                context.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh)
                image = canvas
            }
            this.__applyTransformation(svgImage, matrix)
            svgImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href",
                image.nodeName === "CANVAS" ? image.toDataURL() : image.getAttribute("src"))
            parent.appendChild(svgImage)
        }
    }

    /**
     * Generates a pattern tag
     */
    createPattern(image: HTMLCanvasElement | HTMLImageElement | SVGRenderingContext, __repetition: unknown) {
        const pattern = this.__document.createElementNS("http://www.w3.org/2000/svg", "pattern")
        const id = randomString(this.__ids)
        pattern.setAttribute("id", id)
        pattern.setAttribute("width", String(image.width))
        pattern.setAttribute("height", String(image.height))
        // We want the pattern sizing to be absolute, and not relative
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Patterns
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/patternUnits
        pattern.setAttribute("patternUnits", "userSpaceOnUse")

        if ("nodeName" in image && (image.nodeName === "CANVAS" || image.nodeName === "IMG")) {
            const img = this.__document.createElementNS("http://www.w3.org/2000/svg", "image")
            img.setAttribute("width", String(image.width))
            img.setAttribute("height", String(image.height))
            img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href",
                image.nodeName === "CANVAS" ? (image as HTMLCanvasElement).toDataURL() : image.getAttribute("src")!)
            pattern.appendChild(img)
            this.__defs.appendChild(pattern)
        } else if (image instanceof SVGRenderingContext) {
            pattern.appendChild(image.__root.childNodes[1])
            this.__defs.appendChild(pattern)
        }
        return new CanvasPatternSVG(pattern, this)
    }

    createPath(arg?: string | Path2DSVG): Path2D {
        // we still return Path2D even if we are using Path2DSVG
        // for compatibility with other the std lib
        return new Path2DSVG(this, arg) as unknown as Path2D
    }

    setLineDash(dashArray?: number[]) {
        if (dashArray && dashArray.length > 0) {
            this.lineDash = dashArray.join(",")
        } else {
            this.lineDash = null
        }
    }

    getLineDash() {
        if (this.lineDash === null) {
            return []
        }
        return this.lineDash.split(",").map(s => parseFloat(s))
    }

    /**
     * SetTransform changes the current transformation matrix to
     * the matrix given by the arguments as described below.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setTransform
     */
    setTransform(matrix: DOMMatrixReadOnly): void
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void

    setTransform(am: DOMMatrixReadOnly | number, b?: number, c?: number, d?: number, e?: number, f?: number) {
        if (isUndefined(b)) {
            const m = am as DOMMatrixReadOnly
            this.__transformMatrix = new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f])
        } else {
            const a = am as number
            this.__transformMatrix = new DOMMatrix([a, b, c!, d!, e!, f!])
        }
    }

    /**
     * GetTransform Returns a copy of the current transformation matrix,
     * as a newly created DOMMAtrix Object
     *
     * @returns A DOMMatrix Object
     */
    getTransform() {
        const { a, b, c, d, e, f } = this.__transformMatrix
        return new DOMMatrix([a, b, c, d, e, f])
    }

    /**
     * ResetTransform resets the current transformation matrix to the identity matrix
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/resetTransform
     */
    resetTransform() {
        this.setTransform(1, 0, 0, 1, 0, 0)
    }

    /**
     * Add the scaling transformation described by the arguments to the current transformation matrix.
     *
     * @param x The x argument represents the scale factor in the horizontal direction
     * @param y The y argument represents the scale factor in the vertical direction.
     * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-scale
     */
    scale(x: number, y: number) {
        if (y === undefined) {
            y = x
        }
        // If either of the arguments are infinite or NaN, then return.
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            return
        }
        const matrix = this.getTransform().scale(x, y)
        this.setTransform(matrix)
    }

    /**
     * Rotate adds a rotation to the transformation matrix.
     *
     * @param angle The rotation angle, clockwise in radians. You can use degree * Math.PI / 180 to calculate a radian from a degree.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
     * @see https://www.w3.org/TR/css-transforms-1
     */
    rotate(angle: number) {
        const matrix = this.getTransform().multiply(new DOMMatrix([
            Math.cos(angle),
            Math.sin(angle),
            -Math.sin(angle),
            Math.cos(angle),
            0,
            0,
        ]))
        this.setTransform(matrix)
    }

    /**
     * Translate adds a translation transformation to the current matrix.
     *
     * @param x Distance to move in the horizontal direction. Positive values are to the right, and negative to the left.
     * @param y Distance to move in the vertical direction. Positive values are down, and negative are up.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/translate
     */
    translate(x: number, y: number) {
        const matrix = this.getTransform().translate(x, y)
        this.setTransform(matrix)
    }

    /**
     * Transform multiplies the current transformation with the matrix described by the arguments of this method.
     * This lets you scale, rotate, translate (move), and skew the context.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform
     */
    transform(a: number, b: number, c: number, d: number, e: number, f: number) {
        const matrix = this.getTransform().multiply(new DOMMatrix([a, b, c, d, e, f]))
        this.setTransform(matrix)
    }

    __matrixTransform(x: number, y: number) {
        return new DOMPoint(x, y).matrixTransform(this.__transformMatrix)
    }

    /**
     * 
     * @returns The scale component of the transform matrix as {x,y}.
     */
    __getTransformScale() {
        return {
            x: Math.hypot(this.__transformMatrix.a, this.__transformMatrix.b),
            y: Math.hypot(this.__transformMatrix.c, this.__transformMatrix.d),
        }
    }

    /**
     * 
     * @returns The rotation component of the transform matrix in radians.
     */
    __getTransformRotation() {
        return Math.atan2(this.__transformMatrix.b, this.__transformMatrix.a)
    }

    // /**
    //  *
    //  * @param {*} sx The x-axis coordinate of the top-left corner of the rectangle from which the ImageData will be extracted.
    //  * @param {*} sy The y-axis coordinate of the top-left corner of the rectangle from which the ImageData will be extracted.
    //  * @param {*} sw The width of the rectangle from which the ImageData will be extracted. Positive values are to the right, and negative to the left.
    //  * @param {*} sh The height of the rectangle from which the ImageData will be extracted. Positive values are down, and negative are up.
    //  * @param {Boolean} options.async Will return a Promise<ImageData> if true, must be set to true
    //  * @returns An ImageData object containing the image data for the rectangle of the canvas specified. The coordinates of the rectangle's top-left corner are (sx, sy), while the coordinates of the bottom corner are (sx + sw, sy + sh).
    //  */
    // Context.prototype.getImageData = function(sx, sy, sw, sh, options) {
    //     return imageUtils.getImageData(this.getSvg(), this.width, this.height, sx, sy, sw, sh, options)
    // }



    drawFocusRing() {
        throw new Error('not yet implemented')
    }
    createImageData() {
        throw new Error('not yet implemented')
    }
    putImageData() {
        throw new Error('not yet implemented')
    }
    globalCompositeOperation() {
        throw new Error('not yet implemented')
    }


}


class Path2DSVG {

    public readonly g: SVGRenderingContext
    private _d: string
    private _posX: number | undefined = undefined
    private _posY: number | undefined = undefined

    constructor(g: SVGRenderingContext, path?: string | Path2DSVG) {
        this.g = g
        if (isUndefined(path)) {
            this._d = ""
        } else if (isString(path)) {
            this._d = path
        } else {
            // Initialize by copying another path.
            this._d = path._d
        }
    }

    public get d() {
        return this._d
    }

    addPath(path: string, transform?: DOMMatrix2DInit) {
        if (transform) {
            console.error("transform argument to addPath is not supported")
        }

        this._d = this._d + " " + path
    }

    closePath() {
        this.addPath("Z")
    }

    moveTo(x: number, y: number) {
        // creates a new subpath with the given point
        this._posX = x
        this._posY = y
        const p = this.g.__matrixTransform(x, y)
        this.addPath(`M ${p.x} ${p.y}`)
    }

    lineTo(x: number, y: number) {
        this._posX = x
        this._posY = y
        if (this._d.indexOf("M") > -1) {
            const p = this.g.__matrixTransform(x, y)
            this.addPath(`L ${p.x} ${p.y}`)
        } else {
            const p = this.g.__matrixTransform(x, y)
            this.addPath(`M ${p.x} ${p.y}`)
        }
    }

    rect(x: number, y: number, width: number, height: number) {
        this.moveTo(x, y)
        this.lineTo(x + width, y)
        this.lineTo(x + width, y + height)
        this.lineTo(x, y + height)
        this.lineTo(x, y)
    }

    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
        this._posX = x
        this._posY = y
        const g = this.g
        const cp1 = g.__matrixTransform(cp1x, cp1y)
        const cp2 = g.__matrixTransform(cp2x, cp2y)
        const p = g.__matrixTransform(x, y)
        this.addPath(`C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${p.x} ${p.y}`)
    }

    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
        this._posX = x
        this._posY = y
        const g = this.g
        const cp = g.__matrixTransform(cpx, cpy)
        const p = g.__matrixTransform(x, y)
        this.addPath(`Q ${cp.x} ${cp.y} ${p.x} ${p.y}`)
    }

    arc(
        x: number,
        y: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        counterClockwise = false
    ) {
        // in canvas no circle is drawn if no angle is provided.
        if (startAngle === endAngle) {
            return
        }

        const g = this.g
        startAngle = startAngle % (2 * Math.PI)
        endAngle = endAngle % (2 * Math.PI)
        if (startAngle === endAngle) {
            //circle time! subtract some of the angle so svg is happy (svg elliptical arc can't draw a full circle)
            endAngle =
                (endAngle + 2 * Math.PI - 0.001 * (counterClockwise ? -1 : 1)) %
                (2 * Math.PI)
        }
        const endX = x + radius * Math.cos(endAngle)
        const endY = y + radius * Math.sin(endAngle)
        const startX = x + radius * Math.cos(startAngle)
        const startY = y + radius * Math.sin(startAngle)
        const sweepFlag = counterClockwise ? 0 : 1
        let largeArcFlag = 0
        let diff = endAngle - startAngle

        // https://github.com/gliffy/canvas2svg/issues/4
        if (diff < 0) {
            diff += 2 * Math.PI
        }

        if (counterClockwise) {
            largeArcFlag = diff > Math.PI ? 0 : 1
        } else {
            largeArcFlag = diff > Math.PI ? 1 : 0
        }

        const scaleX = Math.hypot(g.__transformMatrix.a, g.__transformMatrix.b)
        const scaleY = Math.hypot(g.__transformMatrix.c, g.__transformMatrix.d)

        this.lineTo(startX, startY)
        const end = g.__matrixTransform(endX, endY)
        this.addPath(`A ${radius * scaleX} ${radius * scaleY} ${0} ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`)

        this._posX = x
        this._posY = y
    }


    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number) {
        // Based on Webkit implementation from
        // https://github.com/WebKit/webkit/blob/main/Source/WebCore/platform/graphics/cairo/PathCairo.cpp
        // See also http://www.w3.org/TR/2015/WD-2dcontext-20150514/#dom-context-2d-arcto

        // Let the point (x0, y0) be the last point in the subpath.
        const x0 = this._posX
        const y0 = this._posY

        // First ensure there is a subpath for (x1, y1).
        if (isUndefined(x0) || isUndefined(y0)) {
            return
        }

        // Negative values for radius must cause the implementation to throw an IndexSizeError exception.
        if (radius < 0) {
            throw new Error(
                "IndexSizeError: The radius provided (" + radius + ") is negative."
            )
        }

        // If the point (x0, y0) is equal to the point (x1, y1),
        // or if the point (x1, y1) is equal to the point (x2, y2),
        // or if the radius radius is zero,
        // then the method must add the point (x1, y1) to the subpath,
        // and connect that point to the previous point (x0, y0) by a straight line.
        if ((x0 === x1 && y0 === y1) || (x1 === x2 && y1 === y2) || radius === 0) {
            this.lineTo(x1, y1)
            return
        }

        const p1p0 = [x0 - x1, y0 - y1]
        const p1p2 = [x2 - x1, y2 - y1]
        const p1p0_length = Math.hypot(p1p0[0], p1p0[1])
        const p1p2_length = Math.hypot(p1p2[0], p1p2[1])
        const cos_phi = (p1p0[0] * p1p2[0] + p1p0[1] * p1p2[1]) / (p1p0_length * p1p2_length)
        // all points on a line logic
        if (cos_phi === -1) {
            this.lineTo(x1, y1)
            return
        }
        if (cos_phi === 1) {
            // add infinite far away point
            const max_length = 65535
            const factor_max = max_length / p1p0_length
            const ep = [x0 + factor_max * p1p0[0], y0 + factor_max * p1p0[1]]
            this.lineTo(ep[0], ep[1])
            return
        }

        const tangent = radius / Math.tan(Math.acos(cos_phi) / 2)
        const factor_p1p0 = tangent / p1p0_length
        const t_p1p0 = [x1 + factor_p1p0 * p1p0[0], y1 + factor_p1p0 * p1p0[1]]

        let orth_p1p0 = [p1p0[1], -p1p0[0]]
        const orth_p1p0_length = Math.hypot(orth_p1p0[0], orth_p1p0[1])
        const factor_ra = radius / orth_p1p0_length

        // angle between orth_p1p0 and p1p2 to get the right vector orthographic to p1p0
        const cos_alpha = (orth_p1p0[0] * p1p2[0] + orth_p1p0[1] * p1p2[1]) / (orth_p1p0_length * p1p2_length)
        if (cos_alpha < 0) {
            orth_p1p0 = [-orth_p1p0[0], -orth_p1p0[1]]
        }

        const p = [t_p1p0[0] + factor_ra * orth_p1p0[0], t_p1p0[1] + factor_ra * orth_p1p0[1]]

        // calculate angles for addArc
        orth_p1p0 = [-orth_p1p0[0], -orth_p1p0[1]]
        let sa = Math.acos(orth_p1p0[0] / orth_p1p0_length)
        if (orth_p1p0[1] < 0) {
            sa = 2 * Math.PI - sa
        }

        // anticlockwise logic
        let anticlockwise = false

        const factor_p1p2 = tangent / p1p2_length
        const t_p1p2 = [x1 + factor_p1p2 * p1p2[0], y1 + factor_p1p2 * p1p2[1]]
        const orth_p1p2 = [t_p1p2[0] - p[0], t_p1p2[1] - p[1]]
        const orth_p1p2_length = Math.hypot(orth_p1p2[0], orth_p1p2[1])
        let ea = Math.acos(orth_p1p2[0] / orth_p1p2_length)
        if (orth_p1p2[1] < 0) {
            ea = 2 * Math.PI - ea
        }
        if (sa > ea && sa - ea < Math.PI) { anticlockwise = true }
        if (sa < ea && ea - sa > Math.PI) { anticlockwise = true }

        this.lineTo(t_p1p0[0], t_p1p0[1])
        this.arc(p[0], p[1], radius, sa, ea, anticlockwise)
    }

    ellipse(
        x: number,
        y: number,
        radiusX: number,
        radiusY: number,
        rotation: number,
        startAngle: number,
        endAngle: number,
        counterClockwise = false
    ) {
        if (startAngle === endAngle) {
            return
        }

        const g = this.g

        const transformedCenter = g.__matrixTransform(x, y)
        x = transformedCenter.x
        y = transformedCenter.y
        const scale = g.__getTransformScale()
        radiusX = radiusX * scale.x
        radiusY = radiusY * scale.y
        rotation = rotation + g.__getTransformRotation()

        startAngle = startAngle % (2 * Math.PI)
        endAngle = endAngle % (2 * Math.PI)
        if (startAngle === endAngle) {
            endAngle =
                (endAngle + 2 * Math.PI - 0.001 * (counterClockwise ? -1 : 1)) %
                (2 * Math.PI)
        }
        const endX = x +
            Math.cos(-rotation) * radiusX * Math.cos(endAngle) +
            Math.sin(-rotation) * radiusY * Math.sin(endAngle)
        const endY = y -
            Math.sin(-rotation) * radiusX * Math.cos(endAngle) +
            Math.cos(-rotation) * radiusY * Math.sin(endAngle)
        const startX = x +
            Math.cos(-rotation) * radiusX * Math.cos(startAngle) +
            Math.sin(-rotation) * radiusY * Math.sin(startAngle)
        const startY = y -
            Math.sin(-rotation) * radiusX * Math.cos(startAngle) +
            Math.cos(-rotation) * radiusY * Math.sin(startAngle)
        const sweepFlag = counterClockwise ? 0 : 1
        let largeArcFlag = 0
        let diff = endAngle - startAngle

        if (diff < 0) {
            diff += 2 * Math.PI
        }

        if (counterClockwise) {
            largeArcFlag = diff > Math.PI ? 0 : 1
        } else {
            largeArcFlag = diff > Math.PI ? 1 : 0
        }

        // Transform is already applied, so temporarily remove since lineTo
        // will apply it again.
        const currentTransform = g.__transformMatrix
        g.resetTransform()
        this.lineTo(startX, startY)
        g.__transformMatrix = currentTransform

        this.addPath(`A ${radiusX} ${radiusY} ${rotation * (180 / Math.PI)} ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`)
        this._posX = endX
        this._posY = endY
    }

}
