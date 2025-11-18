import Control from "ol/control/Control";

class AtisFieldsControl extends Control {
    constructor() {
        const button = document.createElement('button');
        button.innerHTML = 'A';
        button.title = 'Switch Atis Fields';

        // Position:
        // - 0.5em spacing
        // - 1.375em button
        const container = document.createElement('div');
        container.className = 'ol-unselectable ol-control';
        container.style = 'top: 5.625em; left: 0.5em;';
        container.appendChild(button);

        super({ element: container });

        button.addEventListener('click', () => {
            controlLayers.atisFields = !controlLayers.atisFields;
        }, false);
    }
}
export default AtisFieldsControl;
