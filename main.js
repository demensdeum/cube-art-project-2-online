import * as THREE from './three.module.js'
import GUI from './lil-gui.module.js'
import { mustOpenSiteOnCompanyLogoTap } from './config.js'
import { companySplashTimeout, SdkIntegration, fullMenu } from './config.js'

class SdkIntegrationDelegate {
    sdkIntegrationInitialized(sdkIntegration) {
        console.log("SDK integration initialized")
    }

    sdkIntegrationLanguageSwitched(sdkIntegration, language) {
        const newLanguage = language == 'ru' ? 'ru' : 'en'
        console.log(`document.__global_options: ${document.__global_options}`)
        const options = document.__global_options
        options.language = newLanguage
        translateGUI()
    }
}

const sdkIntegrationDelegate = new SdkIntegrationDelegate()
const sdkIntegration = new SdkIntegration(sdkIntegrationDelegate)
sdkIntegration.load()

document.addEventListener('contextmenu', event => event.preventDefault())

document.handleCompanyLogoTap = () => {
    if (mustOpenSiteOnCompanyLogoTap) {
        window.open('https://www.demensdeum.com', '_blank')
    }
}

class Joystick {
    constructor(id, delegate, size) {
        this.id = id
        this.delegate = delegate
        this.size = size

        this.radius = size * 0.3125
        this.handleRadius = size * 0.14583

        this.container = document.createElement('div')
        this.container.id = `joystick${id}_container`
        this.container.classList.add('joystick-container')

        this.container.style.position = 'absolute'
        this.container.style.width = `${this.size}px`
        this.container.style.height = `${this.size}px`
        this.container.style.touchAction = 'none'
        this.container.style.pointerEvents = 'auto'
        this.container.style.opacity = 0.9
        this.container.style.userSelect = 'none'

        this.canvas = document.createElement('canvas')
        this.canvas.id = `joystick${id}_canvas`
        this.container.appendChild(this.canvas)
        this.ctx = this.canvas.getContext('2d')

        this.canvas.width = this.size
        this.canvas.height = this.size

        this.canvas.style.width = '100%'
        this.canvas.style.height = '100%'
        this.canvas.style.background = 'rgba(0, 0, 0, 0.2)'
        this.canvas.style.borderRadius = '50%'

        this.center = { x: this.size / 2, y: this.size / 2 }

        this.current = { x: 0, y: 0 }
        this.isDragging = false
        this.pointerId = null
        this.normalizedX = 0
        this.normalizedY = 0

        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this))
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this))
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this))
        this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this))
        this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this))
    }

    placeJoystickAt(x, y, zDepth) {
        if (!this.container.parentElement) {
            document.body.appendChild(this.container)
        }

        this.container.style.zIndex = zDepth
        this.container.style.top = `${y}px`
        this.container.style.left = `${x}px`
    }

    updatePosition(x, y) {
        const dx = x - this.center.x
        const dy = y - this.center.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > this.radius) {
            const angle = Math.atan2(dy, dx)
            this.current.x = Math.cos(angle) * this.radius
            this.current.y = Math.sin(angle) * this.radius
        } else {
            this.current.x = dx
            this.current.y = dy
        }

        this.normalizedX = this.current.x / this.radius
        this.normalizedY = -this.current.y / this.radius

        this.delegate(this.id, this.normalizedX, this.normalizedY, this.isDragging)
    }

    draw() {
        const ctx = this.ctx

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        if (!options.cursorVisible) {
            this.canvas.style.background = 'rgba(0, 0, 0, 0.0)'
            return
        }

        const globalAlpha = 0.9
        ctx.globalAlpha = globalAlpha

        ctx.beginPath()
        ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2, false)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.stroke()

        const handleX = this.center.x + this.current.x
        const handleY = this.center.y + this.current.y

        const handleOpacity = this.isDragging ? 1.0 : 0.3

        ctx.beginPath()
        ctx.arc(handleX, handleY, this.handleRadius, 0, Math.PI * 2, false)
        ctx.fillStyle = `rgba(243, 243, 243, ${handleOpacity})`

        if (this.isDragging) {
            ctx.shadowColor = 'rgba(230, 230, 230, 0.7)'
            ctx.shadowBlur = 15
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
            ctx.shadowBlur = 5
        }

        ctx.fill()
        ctx.shadowBlur = 0

        ctx.globalAlpha = 1.0
    }

    reset() {
        this.isDragging = false
        this.pointerId = null
        this.current.x = 0
        this.current.y = 0
        this.normalizedX = 0
        this.normalizedY = 0
        this.delegate(this.id, this.normalizedX, this.normalizedY, this.isDragging)
    }

    startDrag(pointerId) {
        this.isDragging = true
        this.pointerId = pointerId
    }

    handlePointerDown(event) {
        event.preventDefault()
        event.stopPropagation()

        if (!this.isDragging) {
            this.canvas.setPointerCapture(event.pointerId)
            this.startDrag(event.pointerId)

            const rect = this.canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top

            this.updatePosition(x, y)
        }
    }

    handlePointerMove(event) {
        if (this.pointerId !== event.pointerId) return

            const rect = this.canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top

            this.updatePosition(x, y)
    }

    handlePointerUp(event) {
        if (this.pointerId !== event.pointerId) return

            this.canvas.releasePointerCapture(event.pointerId)
            this.reset()
    }
}

var leftJoystick = null
var rightJoystick = null

function positionJoysticks() {
    const joystickNames = ["leftJoystick", "rightJoystick"]
    for (const joystickName of joystickNames) {
        document.getElementById(`joystick${joystickName}_container`)?.remove()
    }

    var JOYSTICK_CONTAINER_SIZE = 240
    var JOYSTICK_HORIZONTAL_PADDING = 32
    const JOYSTICK_VERTICAL_PADDING = 32

    if (innerHeight < 400) {
        JOYSTICK_CONTAINER_SIZE = 120
    }

    if (window.innerWidth < JOYSTICK_CONTAINER_SIZE * 2 + JOYSTICK_HORIZONTAL_PADDING * 2) {
        JOYSTICK_CONTAINER_SIZE = window.innerWidth * 0.4
        JOYSTICK_HORIZONTAL_PADDING = 0
    }

    const JOYSTICK_Z_DEPTH = 1000

    leftJoystick = new Joystick("leftJoystick", handleJoystickMove, JOYSTICK_CONTAINER_SIZE)
    rightJoystick = new Joystick("rightJoystick", handleJoystickMove, JOYSTICK_CONTAINER_SIZE)

    leftJoystick.placeJoystickAt(0, 0, 1000)
    rightJoystick.placeJoystickAt(0, JOYSTICK_CONTAINER_SIZE, 1000)

    const leftX = JOYSTICK_HORIZONTAL_PADDING
    const leftY = window.innerHeight - JOYSTICK_CONTAINER_SIZE - JOYSTICK_VERTICAL_PADDING

    const rightX = window.innerWidth - JOYSTICK_CONTAINER_SIZE - JOYSTICK_HORIZONTAL_PADDING
    const rightY = window.innerHeight - JOYSTICK_CONTAINER_SIZE - JOYSTICK_VERTICAL_PADDING

    leftJoystick.placeJoystickAt(leftX, leftY, JOYSTICK_Z_DEPTH)
    rightJoystick.placeJoystickAt(rightX, rightY, JOYSTICK_Z_DEPTH)
}

function handleJoystickMove(id, x, y, isDragging) {
    if (id == "leftJoystick") {
        if (x > 0.2) {
            move.left = false
            move.right = true
        }
        else if (x < -0.2) {
            move.left = true
            move.right = false
        }
        else {
            move.left = false
            move.right = false
        }


        if (y < -0.2) {
            move.forward = false
            move.backward = true
        }
        else if (y > 0.2) {
            move.forward = true
            move.backward = false
        }
        else {
            move.forward = false
            move.backward = false
        }
    }
}

positionJoysticks()

const NandHexColor = 0x8000C0;
const SignalHexColor = 0xFFD700

const i18n = {
    en: {
        cubeColor: 'Color',
        showCursor: 'Cursor',
        background: 'Background',
        moveSpeed: 'Speed',
        saveScene: '💾 Save',
        instructions: 'Click to start editing',
        Language: 'Language',
    },
    ru: {
        cubeColor: 'Цвет',
        showCursor: 'Курсор',
        background: 'Фон',
        moveSpeed: 'Скорость',
        saveScene: '💾 Сохранить',
        instructions: 'Нажмите, чтобы начать редактирование',
        Language: 'Язык',
    }
}

const CUBES_WS_URL = `wss://tinydemens1.vps.webdock.cloud:8080`
const PLAYERS_WS_URL = `wss://tinydemens1.vps.webdock.cloud:8081`

let wsCubes = null
let wsPlayers = null
let myUUID = null
let lastSentPosition = new THREE.Vector3()
const REMOTE_PLAYER_MESH_COLOR = 0x00ffff
const remotePlayers = new Map()
const remotePlayerGeometry = new THREE.SphereGeometry(0.4, 16, 16)
const remotePlayerMaterial = new THREE.MeshBasicMaterial({ color: REMOTE_PLAYER_MESH_COLOR })
const PLAYER_MOVE_SEND_INTERVAL_MS = 50
let lastMoveSendTime = 0

const updateStatus = () => {
    const statusDiv = document.getElementById('status')
    const cubesState = wsCubes?.readyState === wsCubes?.OPEN ? 'Cubes: Open' : 'Cubes: Closed'
    const playersState = wsPlayers?.readyState === wsPlayers?.OPEN ? 'Players: Open' : 'Players: Closed'

    let color = '#ff0000'
    if (wsCubes?.readyState === wsCubes?.OPEN || wsPlayers?.readyState === wsPlayers?.OPEN) {
        color = '#ffff00'
    }
    if (wsCubes?.readyState === wsCubes?.OPEN && wsPlayers?.readyState === wsPlayers?.OPEN) {
        color = '#00ff00'
    }

    statusDiv.textContent = `${playersState} | ${cubesState} (UUID: ${myUUID || 'N/A'})`
    statusDiv.style.color = color
    statusDiv.style.opacity = 0.0
    statusDiv.style.userSelect = 'none'
}

const onWsPlayersMessage = (event) => {
    try {
        const data = JSON.parse(event.data)

        switch (data.type) {
            case 'playerCreated':
                myUUID = data.player.uuid
                camera.position.set(data.player.x, data.player.y, data.player.z)
                updateStatus()
                console.log('My UUID is:', myUUID)
                break

            case 'playersUpdate':
                updateRemotePlayers(data.players)
                break

            default:
                console.log('Received unknown players message type:', data)
                break
        }
    } catch (e) {
        console.error('Failed to parse incoming players message:', e)
    }
}

const onWsCubesMessage = (event) => {
    try {
        const data = JSON.parse(event.data)
        switch (data.type) {
            case 'stateUpdate':
                console.log('Received full state update. Synchronizing scene.')
                const serverCubes = data.cubes

                const clientCubeKeys = new Set(cubes.keys())
                const serverCubeKeys = new Set(Object.keys(serverCubes))

                console.log(clientCubeKeys)
                console.log(serverCubes)

                for (const key of clientCubeKeys) {
                    if (!serverCubeKeys.has(key)) {
                        const [x, y, z] = JSON.parse(key)
                        console.log(`removed cube ${x} ${y} ${z}`)
                        removeCubeAt(x, y, z, false)
                    }
                }

                for (const key in serverCubes) {
                    if (!clientCubeKeys.has(key)) {
                        const cubeData = serverCubes[key];
                        const hexColor = intToHex(cubeData.color)
                        addCubeAt(cubeData.x, cubeData.y, cubeData.z, hexColor, false)
                    }
                }

                console.log(`Scene synchronized. Cubes on server: ${serverCubeKeys.size}. Cubes now on client: ${cubes.size}.`)
                break

            default:
                console.log('Received unknown cubes message type:', data)
                break
        }

    } catch (e) {
        console.error('Failed to parse incoming cubes message:', e)
    }
}

const sendAddCube = (x, y, z, hexColor) => {
    console.log(hexColor)
    if (wsCubes?.readyState === wsCubes?.OPEN) {
        wsCubes.send(js({
            method: 'addCube',
            x: x,
            y: y,
            z: z,
            rgbColor: hexColor
        }))
    } else {
        console.warn('Cubes server not connected. Cube creation not synchronized.')
    }
}

const sendRemoveCube = (x, y, z) => {
    if (wsCubes?.readyState === wsCubes?.OPEN) {
        wsCubes.send(js({
            method: 'removeCube',
            x: x,
            y: y,
            z: z
        }))
    } else {
        console.warn('Cubes server not connected. Cube removal not synchronized.')
    }
}

const updateRemotePlayers = (serverPlayers) => {
    const receivedUUIDs = new Set()

    for (const uuid in serverPlayers) {
        const player = serverPlayers[uuid]
        receivedUUIDs.add(uuid)

        if (uuid === myUUID) continue

            if (!remotePlayers.has(uuid)) {
                const mesh = new THREE.Mesh(remotePlayerGeometry, remotePlayerMaterial)
                scene.add(mesh)
                remotePlayers.set(uuid, { mesh })
            }

            const remotePlayer = remotePlayers.get(uuid)
            if (remotePlayer) {
                remotePlayer.mesh.position.set(player.x, player.y, player.z)
            }
    }

    const playersToRemove = []
    for (const [uuid, remotePlayer] of remotePlayers.entries()) {
        if (!receivedUUIDs.has(uuid)) {
            playersToRemove.push(uuid)
            scene.remove(remotePlayer.mesh)
        }
    }

    playersToRemove.forEach(uuid => {
        remotePlayers.delete(uuid)
        console.log(`Removed remote player: ${uuid}`)
    })
}

const connectWebSocket = () => {
    wsPlayers = new WebSocket(PLAYERS_WS_URL)
    wsPlayers.onopen = () => {
        updateStatus()
        wsPlayers.send(JSON.stringify({ method: 'addPlayer' }))
    }
    wsPlayers.onmessage = onWsPlayersMessage
    wsPlayers.onerror = updateStatus
    wsPlayers.onclose = () => {
        myUUID = null
        updateStatus()
    }

    wsCubes = new WebSocket(CUBES_WS_URL)
    wsCubes.onopen = updateStatus
    wsCubes.onmessage = onWsCubesMessage
    wsCubes.onerror = updateStatus
    wsCubes.onclose = updateStatus

    updateStatus()
}

function intToHex(intColorString) {
    const intColor = parseInt(intColorString, 10)
    if (isNaN(intColor) || intColor < 0 || intColor > 0xFFFFFF) {
        return '#ffffff'
    }
    return '#' + intColor.toString(16).padStart(6, '0')
}

function js(object) {
    return JSON.stringify(object)
}

function handleCameraRotation(x, y) {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ')
    const PI_2 = Math.PI / 2
    const movementX = x || 0
    const movementY = y || 0
    euler.setFromQuaternion(camera.quaternion)
    euler.y -= movementX * 0.002
    euler.x -= movementY * 0.002
    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x))
    camera.quaternion.setFromEuler(euler)
}

class PointerLockControls extends THREE.EventDispatcher {
    constructor(camera, domElement) {
        super()
        this.domElement = domElement
        this.isLocked = false

        const scope = this

        function onMouseMove(event) {
            if (!scope.isLocked) return
            handleCameraRotation(event.movementX, event.movementY)
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

let cubes = new Map()
let signalCubes = new Set()
let nandCubes = new Map()

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const INITIAL_AMBIENT_INTENSITY = 0.85
const INITIAL_HEMISPHERE_INTENSITY = 0.85

const ambientLight = new THREE.AmbientLight(0xffffff, INITIAL_AMBIENT_INTENSITY)
scene.add(ambientLight)

const hemisphereLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, INITIAL_HEMISPHERE_INTENSITY)
scene.add(hemisphereLight)

const sunLight = new THREE.DirectionalLight(0xfff5e6, 3.5)
sunLight.position.set(200, 100, 50)
scene.add(sunLight)

const geometry = new THREE.BoxGeometry(1, 1, 1)

const controls = new PointerLockControls(camera, document.body)
scene.add(controls.getObject())

const instructions = document.getElementById('instructions')
instructions.addEventListener('click', () => controls.lock())

document.addEventListener('pointerlockchange', () => {
    const isLocked = document.pointerLockElement === document.body
    instructions.style.display = isLocked ? 'none' : ''
});

document.body.addEventListener('click', (event) => {
    if (document.pointerLockElement === document.body) {
        toggleCubeInFront()
    }
    else if (
        !controls.isLocked &&
        event.clientX > window.innerWidth * 0.3 &&
        event.clientX < window.innerWidth * 0.7 &&
        event.clientY > window.innerHeight * 0.3 &&
        event.clientY < window.innerHeight * 0.7
    ) {
        toggleCubeInFront()
    }
});

const cursorMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    opacity: 0.5,
    transparent: true
});

const cursorCube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    cursorMaterial
);

scene.add(cursorCube)

const move = { forward: false, backward: false, left: false, right: false, up: false, down: false }
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

document.addEventListener('keydown', e => {
    if (e.code === 'KeyW') move.forward = true
    if (e.code === 'KeyS') move.backward = true
    if (e.code === 'KeyA') move.left = true
    if (e.code === 'KeyD') move.right = true
    if (e.code === 'Space') move.up = true
    if (e.code === 'ControlLeft') move.down = true
});

document.addEventListener('keyup', e => {
    if (e.code === 'KeyW') move.forward = false
    if (e.code === 'KeyS') move.backward = false
    if (e.code === 'KeyA') move.left = false
    if (e.code === 'KeyD') move.right = false
    if (e.code === 'Space') move.up = false
    if (e.code === 'KeyF') toggleCubeInFront()
    if (e.code === 'ControlLeft') move.down = false
});

function clearScene() {
    cubes.forEach((value, key) => {
        removeCubeAt(value.position.x, value.position.y, value.position.z)
    })
    cubes.clear()
    signalCubes.clear()
    nandCubes.clear()
}

function isThereCubeAt(x, y, z) {
    return cubes.has(js([x, y, z]))
}

function addCubeAt(x, y, z, hex, broadcast = true) {
    console.log(hex)
    const hexColor = new THREE.Color(hex).getHex()
    const material = new THREE.MeshLambertMaterial({ color: hexColor })
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)

    cube.position.x = x
    cube.position.y = y
    cube.position.z = z

    scene.add(cube)

    cubes.set(js([x, y, z]), cube)

    if (hexColor == NandHexColor) {
        nandCubes.set(js([x, y, z]), [x, y, z])
    }
    else if (hexColor == SignalHexColor) {
        signalCubes.add(js([x, y, z]))
    }

    if (broadcast) {
        sendAddCube(x, y, z, hex)
    }
}

function removeCubeAt(x, y, z, broadcast = true) {
    const cube = cubes.get(js([x, y, z]))
    scene.remove(cube)
    cubes.delete(js([x, y, z]))
    nandCubes.delete(js([x, y, z]))
    signalCubes.delete(js([x, y, z]))
    if (broadcast) {
        sendRemoveCube(x, y, z)
    }
}

function toggleCubeAt(x, y, z, hex) {
    if (isThereCubeAt(x, y, z)) {
        removeCubeAt(x, y, z)
    }
    else {
        addCubeAt(x, y, z, hex)
    }
}

function toggleCubeInFront() {
    const distance = 3;
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)

    const position = new THREE.Vector3()
    position.copy(camera.position).add(dir.multiplyScalar(distance))

    position.x = Math.round(position.x)
    position.y = Math.round(position.y)
    position.z = Math.round(position.z)

    const hexColor = new THREE.Color(options.cubeColor).getHex()

    toggleCubeAt(position.x, position.y, position.z, hexColor)
}

const gui = new GUI()
const options = {
    grid: false,
    axes: false,
    cubeColor: '#ffffff',
    cursorVisible: true,
    speed: 10,
    backgroundColor: '#000000',
    language: 'en',
}

document.__global_options = options

if (fullMenu) {
    const langController = gui.add(options, 'language', { English: 'en', Русский: 'ru' })
    .name(i18n[options.language].Language)
    .onChange(() => {
        translateGUI();
    })
}

const colorController = gui.addColor(options, 'cubeColor').name(i18n[options.language].cubeColor)

if (fullMenu) {
    const cursorController = gui.add(options, 'cursorVisible').name(i18n[options.language].showCursor)
    const backgroundColorController = gui.addColor(options, 'backgroundColor')
    .name(i18n[options.language].background)
    .onChange(color => renderer.setClearColor(color));
    const speedController = gui.add(options, 'speed', 0.1, 100, 0.1).name(i18n[options.language].moveSpeed)
    const saveController = gui.add({ save: saveSceneToFile }, 'save').name(i18n[options.language].saveScene)
}

const clock = new THREE.Clock()

function step() {
    requestAnimationFrame(step)

    const delta = clock.getDelta()

    direction.z = Number(move.forward) - Number(move.backward)
    direction.x = Number(move.right) - Number(move.left)
    direction.normalize();

    handleCameraRotation(rightJoystick.normalizedX * 10, -rightJoystick.normalizedY * 10)

    if (
        controls.isLocked ||
        leftJoystick.isDragging ||
        rightJoystick.isDragging
    ) {
        velocity.x = direction.x * options.speed * delta
        velocity.z = direction.z * options.speed * delta
        velocity.y = move.up ? options.speed * delta : 0
        if (!move.up) {
            velocity.y = move.down ? -options.speed * delta : 0
        }

        controls.moveRight(velocity.x)
        controls.moveForward(velocity.z)
        camera.position.y += velocity.y
    }

    const now = Date.now()
    if (
        wsPlayers &&
        wsPlayers.readyState === wsPlayers.OPEN &&
        myUUID &&
        now - lastMoveSendTime > PLAYER_MOVE_SEND_INTERVAL_MS
    ) {
        const currentPos = camera.position

        if (!lastSentPosition.equals(currentPos)) {
            wsPlayers.send(JSON.stringify({
                method: 'playerMove',
                playerUUID: myUUID,
                x: currentPos.x,
                y: currentPos.y,
                z: currentPos.z
            }))
            lastSentPosition.copy(currentPos)
            lastMoveSendTime = now
        }
    }

    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    const pos = new THREE.Vector3().copy(camera.position).add(dir.multiplyScalar(3))
    pos.x = Math.round(pos.x)
    pos.y = Math.round(pos.y)
    pos.z = Math.round(pos.z)
    cursorCube.position.copy(pos)
    cursorMaterial.color.set(options.cubeColor)
    cursorMaterial.opacity = options.cursorVisible ? 0.5 : 0.0
    cursorMaterial.visible = options.cursorVisible

    renderer.setClearColor(options.backgroundColor)
    renderer.render(scene, camera)

    leftJoystick.draw()
    rightJoystick.draw()
}

function translateGUI() {
    colorController.name(i18n[options.language].cubeColor)
    cursorController.name(i18n[options.language].showCursor)
    backgroundColorController.name(i18n[options.language].background)
    speedController.name(i18n[options.language].moveSpeed)
    saveController.name(i18n[options.language].saveScene)
    langController.name(i18n[options.language].Language)
    langController.updateDisplay()
}

function saveSceneToFile() {
    const cameraData = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z]
    }

    const serializedCubes = new Array()

    cubes.forEach((value, key) => {
        const hex = value.material.color.getHexString();
        serializedCubes.push([value.position.x, value.position.y, value.position.z, `#${hex}`])
    })

    const sceneData = {
        header: "Cube Art Project 2 Scene File - 2.0.0",
        camera: cameraData,
        cubes: serializedCubes,
        backgroundColor: options.backgroundColor
    }

    const json = js(sceneData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'scene.cartp2'
    a.click()

    URL.revokeObjectURL(url)
}

const positionMenu = () => {
    if (window.innerWidth / window.innerHeight < 1) {
        document.getElementsByClassName("lil-gui")[0].style.scale =  window.innerWidth < 400 ? 1 : 2
        document.getElementsByClassName("lil-gui")[0].style.right = window.innerWidth < 400 ? 1 : 150
    } else {
        document.getElementsByClassName("lil-gui")[0].style.scale = 1
        document.getElementsByClassName("lil-gui")[0].style.right = "0px"
    }
}

positionMenu()
connectWebSocket()
step()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    positionJoysticks()
    positionMenu()
})

setTimeout(()=> {
    const companySplash = document.getElementById("companySplash")
    companySplash.style.display = 'none'
}, companySplashTimeout)

if (mustOpenSiteOnCompanyLogoTap) {
    document.getElementById("companySplash").style.cursor = "pointer"
}
