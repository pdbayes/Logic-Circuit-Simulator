# TODO List for Logic System Simulator


## High priority

 * Switch to web components
 * make input constant 0 or 1
 * prevent click event if right-clik
 * handle rapid second click as a repeated click if doubleClick not handled
 * disable input of component (e.g., to make exercise to prevent alu from auto doing a subtraction)
 * add label
 * add rectangle


## Medium priority

 * Add contextual menu to clock
 * [Ivan Moura] faire un copier-coller d'un circuit nous permettrait de répliquer ce lui-ci plusieurs, par exemple - dans notre cas  la création d'un registre puis d'une mémoire.
 * [Ivan Moura] dans le prolongement de ceci, la possibilité de définir un nouveau  composant sur la base d'un circuit créé (p.ex. une cellule de mémoire (bascule), puis un registre). Le même principe que l'additionneur en somme.
 * [Ivan Moura] dans la vue "static", il serait intéressant de désactiver la coloration des connexions et des entrées/sorties, ce qui permettrait de présenter le schéma "neutre".
 


## Low priority

 * ...


### DONE

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
