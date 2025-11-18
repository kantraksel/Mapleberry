import Control from "ol/control/Control";

class VisibilityControl extends Control {
    constructor() {
        const button = document.createElement('button');
        button.innerHTML = 'V';
        button.title = 'Switch Airplane Visibility';

        // Position:
        // - 0.5em spacing
        // - 1.375em button
        const container = document.createElement('div');
        container.className = 'ol-unselectable ol-control';
        container.style = 'top: 9.375em; left: 0.5em;';
        container.appendChild(button);

        super({ element: container });

        button.addEventListener('click', () => {
            planeLayers.visible = !planeLayers.visible;
        }, false);
    }
}
export default VisibilityControl;
