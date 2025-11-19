import Control from "ol/control/Control";

class AirplaneLabelControl extends Control {
    constructor() {
        const button = document.createElement('button');
        button.innerHTML = 'P';
        button.title = 'Switch Plane Label: Simple or Extended';

        // Position:
        // - 0.5em spacing
        // - 1.375em button
        const container = document.createElement('div');
        container.className = 'ol-unselectable ol-control';
        container.style = 'top: 3.750em; left: 0.5em;';
        container.appendChild(button);

        super({ element: container });

        button.addEventListener('click', () => {
            planeLayers.extendedLabels = !planeLayers.extendedLabels;
        }, false);
    }
}
export default AirplaneLabelControl;
