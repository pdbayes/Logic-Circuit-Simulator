# TODO List for Logic System Simulator


## High priority

 * undo/redo
 * Add Raph's exercise to Modulo
 * lock position
 * add label
 * add rectangle
 * make input constant 0 or 1
 * prevent click event if right-click
 * 4 bit adder with carry in and out
 * show value on dip switch and register
 * more consistently set things dirty
 * custom display for 4-bit input


## Medium priority

 * Add contextual menu to clock
 * edge detector
 * mux graphics
 * demux
 * high-Z bus logic
 * [Ivan Moura] faire un copier-coller d'un circuit nous permettrait de répliquer ce lui-ci plusieurs, par exemple - dans notre cas  la création d'un registre puis d'une mémoire.
 * [Ivan Moura] dans le prolongement de ceci, la possibilité de définir un nouveau  composant sur la base d'un circuit créé (p.ex. une cellule de mémoire (bascule), puis un registre). Le même principe que l'additionneur en somme.


## Low priority

 * disable input of component (e.g., to make exercise to prevent alu from knowing how to do a subtraction)
 * handle rapid second click as a repeated click if doubleClick not handled
 * embed images with esbuild's dataurl loader; import CSS and HTML templates as well?
 * Add mouseovers to new components
 * switch to https://www.floating-ui.com for tooltips?
 * Lock component to some "parent" to move them more intuitively?
 * Lock component to prevent them from being moveable/selectable
 * add external component by drag-and-drop from file


### DONE

 * Switch to embeddable web components with single JS file
 * chainable 4-bit counter
 * option to have disconnected as high-Z
 * 16 x 4 bit memory
 * editor-level options and UI to set options
 * can now color all wires and nodes as neutral
 * replace fillText with drawLabel
 * edge detector -- can now be done with XOR(A, NOT(NOT(A)))) with new propagation system
 * Fix flipflop update issue, e.g. in shift register
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
