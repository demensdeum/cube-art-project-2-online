import * as THREE from './three.module.js'

export class PointerLockControls extends THREE.EventDispatcher {
    constructor(camera, domElement) {
        super()
        this.domElement = domElement
        this.isLocked = false

        const scope = this

        function onMouseMove(event) {
            if (!scope.isLocked) return
                document.__global_game.handleCameraRotation(event.movementX, event.movementY)
        }

        function onPointerlockChange() {
            scope.isLocked = document.pointerLockElement === domElement
        }

        function onPointerlockError() {
            console.error('PointerLockControls: Unable to use Pointer Lock API')
        }

        this.connect = function () {
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('pointerlockchange', onPointerlockChange)
            document.addEventListener('pointerlockerror', onPointerlockError)
        };

        this.getObject = () => camera;
        this.lock = () => domElement.requestPointerLock()
        this.unlock = () => document.exitPointerLock()

        this.getDirection = () => {
            const direction = new THREE.Vector3(0, 0, -1)
            return v => v.copy(direction).applyQuaternion(camera.quaternion)
        };

        this.moveForward = (distance) => {
            const vec = new THREE.Vector3()
            this.getDirection()(vec)
            camera.position.addScaledVector(vec, distance)
        };

        this.moveRight = (distance) => {
            const vec = new THREE.Vector3()
            this.getDirection()(vec)
            vec.cross(camera.up)
            camera.position.addScaledVector(vec, distance)
        };

        this.connect();
    }
}
