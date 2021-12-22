# TODO List for Logic System Simulator


## High priority

 * Fix flipflop update issue, e.g. in shift register
 * 16 x 4 bit memory
 * 4 bit adder with carry in and out
 * show value on dip switch and register



## Medium priority

 * Add contextual menu to clock
 * Add free text and frames as elements
 * set clock frequency from context menu
 * undo/redo
 * edge detector
 * mux graphics
 * demux
 * Rename: OutputBit, OutputAscii, OutputBar, OutputNibble, OutputShiftBuffer; InputBit, Clock, InputNibble, InputShiftBuffer


## Low priority

 * embed images with esbuild's dataurl loader; import CSS and HTML templates as well?
 * Add mouseovers to new components
 * switch to https://www.floating-ui.com for tooltips?
 * Lock component to some "parent" to move them more intuitively?
 * Lock component to prevent them from being moveable/selectable
 * add external component by drag-and-drop from file


### DONE

 * Multiplexers
 * Use esbuild to create bundle
 * Add 4-bit register
 * Add 4-bit dip switch showing value
 * Insert midpoints for wires to route them better
 * Get rid of p5
 * Add contextual menu to displays and adder
 * Refactor component hierarachy, in-memory list and JSON repr
 * Extract common stuff into Component superclass
 * Align input and output nodes on grid
 * Connect components with Shift key for overlapping nodes
 * Make 'esc' cancel item placement (wire or component)
 * Allow forcing output nodes to a predefined value
 * Allow inputs to be undetermined ('?')
 * Allow gates to be drawn in an undetermined shape
 * Change cursor depending on possible interaction
 * Validate JSON when loaded, define JSON types in a smart way
 * Allow changing modes, add admin mode to force nodes in states
 * Generate links or Markdown blocks with given diagram
 * Optimize draw calls
 * Support touch events
 * Unify click-and-drag also from left buttons instead of click-and-move
