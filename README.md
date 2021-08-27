# Logic Circuit Simulator

A logic circuit simulator useful for educational use.

This is a fork followed by an almost complete rewrite of [drendog's Logic-Circuit-Simuator](https://github.com/drendog/Logic-Circuit-Simulator).


## Demo

See <https://jp.pellet.name/hep/logiga/>


## Development

 * Checkout with git
 * `npm install`
 * Open VS Code and start compilation in watch mode
 * `npm run watch-pack` to build the bundle
 * `npm run server` to serve locally for testing


## Differences with Original Version

 * This fork is written in TypeScript
 * Interface is drawnly differently, all with p5/canvas calls and no external images
 * Screen is only refreshed when needed and not 60 times per second no matter what
 * Components have been added: bit display, segment display, nibble display, half adder, etc.
 * Mouseovers have been added
 * Components can be edited to be faulty, for educational exercises
 * Editor can be in several modes with different capabilities
 * Some components have been removed (for now)
 * Component buttons can be hidden or shown for educational purposes with URL parameters
 * Loading and saving using JSON is much cleaner and does not include unnecessary properties
 * Demo circuits are predefined and can be loaded from the JavaScript console


## License

[MIT](https://choosealicense.com/licenses/mit/)
