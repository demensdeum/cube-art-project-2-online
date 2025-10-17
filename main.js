import * as THREE from './three.module.js'
import GUI from './lil-gui.module.js'
import { mustOpenSiteOnCompanyLogoTap } from './config.js'
import {
    noHotkeys,
    companySplashTimeout,
    SdkIntegration,
    fullMenu
} from './config.js'
import { SdkIntegrationDelegate } from './sdkIntegrationDelegate.js'
import { Joystick } from './joystick.js'
import { PointerLockControls } from './pointerLockControls.js'

class Game {
    constructor() {
        document.__global_game = this
    }

    start() {
        this.leftJoystick = null
        this.rightJoystick = null
        this.sdkIntegrationDelegate = new SdkIntegrationDelegate()
        this.sdkIntegration = new SdkIntegration(this.sdkIntegrationDelegate)
        this.sdkIntegration.load()

        document.addEventListener('contextmenu', event => event.preventDefault())

        document.handleCompanyLogoTap = () => {
            if (mustOpenSiteOnCompanyLogoTap) {
                window.open('https://www.demensdeum.com', '_blank')
            }
        }

        this.positionJoysticks()

        this.i18n = {
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

        this.CUBES_WS_URL = `wss://tinydemens1.vps.webdock.cloud:8080`
        this.PLAYERS_WS_URL = `wss://tinydemens1.vps.webdock.cloud:8081`

        this.wsCubes = null
        this.wsPlayers = null
        this.myUUID = null
        this.lastSentPosition = new THREE.Vector3()
        this.REMOTE_PLAYER_MESH_COLOR = 0x00ffff
        this.remotePlayers = new Map()
        this.remotePlayerGeometry = new THREE.SphereGeometry(0.4, 16, 16)
        this.remotePlayerMaterial = new THREE.MeshBasicMaterial({ color: this.REMOTE_PLAYER_MESH_COLOR })
        this.PLAYER_MOVE_SEND_INTERVAL_MS = 50
        this.lastMoveSendTime = 0

        this.cubes = new Map()
        this.signalCubes = new Set()
        this.nandCubes = new Map()

        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.camera.position.set(0, 0, 0)

        this.renderer = new THREE.WebGLRenderer({ antialias: true })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)

        this.INITIAL_AMBIENT_INTENSITY = 0.85
        this.INITIAL_HEMISPHERE_INTENSITY = 0.85

        this.ambientLight = new THREE.AmbientLight(0xffffff, this.INITIAL_AMBIENT_INTENSITY)
        this.scene.add(this.ambientLight)

        this.hemisphereLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, this.INITIAL_HEMISPHERE_INTENSITY)
        this.scene.add(this.hemisphereLight)

        this.sunLight = new THREE.DirectionalLight(0xfff5e6, 3.5)
        this.sunLight.position.set(200, 100, 50)
        this.scene.add(this.sunLight)

        this.geometry = new THREE.BoxGeometry(1, 1, 1)

        this.controls = new PointerLockControls(this.camera, document.body)
        this.scene.add(this.controls.getObject())

        this.instructions = document.getElementById('instructions')
        instructions.addEventListener('click', () => document.__global_game.controls.lock())

        document.addEventListener('pointerlockchange', () => {
            const isLocked = document.pointerLockElement === document.body
            instructions.style.display = isLocked ? 'none' : ''
        });

        document.body.addEventListener('click', (event) => {
            if (document.pointerLockElement === document.body) {
                document.__global_game.toggleCubeInFront()
            }
            else if (
                !document.__global_game.controls.isLocked &&
                event.clientX > window.innerWidth * 0.3 &&
                event.clientX < window.innerWidth * 0.7 &&
                event.clientY > window.innerHeight * 0.3 &&
                event.clientY < window.innerHeight * 0.7
            ) {
                document.__global_game.toggleCubeInFront()
            }
        });

        this.cursorMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            opacity: 0.5,
            transparent: true
        });

        this.cursorCube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
                                          this.cursorMaterial
        );

        this.scene.add(this.cursorCube)

        this.move = { forward: false, backward: false, left: false, right: false, up: false, down: false }
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        document.addEventListener('keydown', e => {
            if (e.code === 'KeyW') document.__global_game.move.forward = true
                if (e.code === 'KeyS') document.__global_game.move.backward = true
                    if (e.code === 'KeyA') document.__global_game.move.left = true
                        if (e.code === 'KeyD') document.__global_game.move.right = true
                            if (e.code === 'Space') document.__global_game.move.up = true
                                const goDownKey = document.__global_game.noHotkeys ? 'KeyC' : 'ControlLeft'
                                if (e.code === goDownKey) document.__global_game.move.down = true
        });

            document.addEventListener('keyup', e => {
                if (e.code === 'KeyW') document.__global_game.move.forward = false
                    if (e.code === 'KeyS') document.__global_game.move.backward = false
                        if (e.code === 'KeyA') document.__global_game.move.left = false
                            if (e.code === 'KeyD') document.__global_game.move.right = false
                                if (e.code === 'Space') document.__global_game.move.up = false
                                    if (e.code === 'KeyF') document.__global_game.toggleCubeInFront()
                                        const goDownKey = document.__global_game.noHotkeys ? 'KeyC' : 'ControlLeft'
                                        if (e.code === goDownKey) document.__global_game.move.down = false
            });

                this.gui = new GUI()
                this.options = {
                    grid: false,
                    axes: false,
                    cubeColor: '#ffffff',
                    cursorVisible: true,
                    speed: 10,
                    backgroundColor: '#000000',
                    language: 'en',
                }

                document.__global_options = this.options

                if (fullMenu) {
                    const langController = this.gui.add(this.options, 'language', { English: 'en', Русский: 'ru' })
                    .name(this.i18n[this.options.language].Language)
                    .onChange(() => {
                        translateGUI();
                    })
                }

                const colorController = this.gui.addColor(this.options, 'cubeColor').name(this.i18n[this.options.language].cubeColor)

                if (fullMenu) {
                    const cursorController = this.gui.add(this.options, 'cursorVisible').name(this.i18n[this.options.language].showCursor)
                    const backgroundColorController = this.gui.addColor(this.options, 'backgroundColor')
                    .name(this.i18n[this.options.language].background)
                    .onChange(color => renderer.setClearColor(color));
                    const speedController = this.gui.add(this.options, 'speed', 0.1, 100, 0.1).name(this.i18n[this.options.language].moveSpeed)
                    const saveController = this.gui.add({ save: this.saveSceneToFile }, 'save').name(this.i18n[this.options.language].saveScene)
                }

                window.addEventListener('resize', () => {
                    document.__global_game.camera.aspect = window.innerWidth / window.innerHeight
                    document.__global_game.camera.updateProjectionMatrix()
                    document.__global_game.renderer.setSize(window.innerWidth, window.innerHeight)
                    document.__global_game.positionJoysticks()
                    document.__global_game.positionMenu()
                })

                setTimeout(()=> {
                    const companySplash = document.getElementById("companySplash")
                    companySplash.style.display = 'none'
                    document.__global_game.sdkIntegration.handleGameStart()
                }, companySplashTimeout)

                if (mustOpenSiteOnCompanyLogoTap) {
                    document.getElementById("companySplash").style.cursor = "pointer"
                }

                this.clock = new THREE.Clock()

                this.positionMenu()
                this.connectWebSocket()
                this.step()
    }

    positionJoysticks() {
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

        this.leftJoystick = new Joystick("leftJoystick", this.handleJoystickMove, JOYSTICK_CONTAINER_SIZE)
        this.rightJoystick = new Joystick("rightJoystick", this.handleJoystickMove, JOYSTICK_CONTAINER_SIZE)

        this.leftJoystick.placeJoystickAt(0, 0, 1000)
        this.rightJoystick.placeJoystickAt(0, JOYSTICK_CONTAINER_SIZE, 1000)

        const leftX = JOYSTICK_HORIZONTAL_PADDING
        const leftY = window.innerHeight - JOYSTICK_CONTAINER_SIZE - JOYSTICK_VERTICAL_PADDING

        const rightX = window.innerWidth - JOYSTICK_CONTAINER_SIZE - JOYSTICK_HORIZONTAL_PADDING
        const rightY = window.innerHeight - JOYSTICK_CONTAINER_SIZE - JOYSTICK_VERTICAL_PADDING

        this.leftJoystick.placeJoystickAt(leftX, leftY, JOYSTICK_Z_DEPTH)
        this.rightJoystick.placeJoystickAt(rightX, rightY, JOYSTICK_Z_DEPTH)
    }

    handleJoystickMove(id, x, y, isDragging) {
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

    updateStatus() {
        const statusDiv = document.getElementById('status')
        const cubesState = this.wsCubes?.readyState === this.wsCubes?.OPEN ? 'Cubes: Open' : 'Cubes: Closed'
        const playersState = this.wsPlayers?.readyState === this.wsPlayers?.OPEN ? 'Players: Open' : 'Players: Closed'

        let color = '#ff0000'
        if (this.wsCubes?.readyState === this.wsCubes?.OPEN || this.wsPlayers?.readyState === this.wsPlayers?.OPEN) {
            color = '#ffff00'
        }
        if (this.wsCubes?.readyState === this.wsCubes?.OPEN && this.wsPlayers?.readyState === this.wsPlayers?.OPEN) {
            color = '#00ff00'
        }

        statusDiv.textContent = `${playersState} | ${cubesState} (UUID: ${this.myUUID || 'N/A'})`
        statusDiv.style.color = color
        statusDiv.style.opacity = 0.0
        statusDiv.style.userSelect = 'none'
    }

    onWsPlayersMessage(event) {
        try {
            const data = JSON.parse(event.data)

            switch (data.type) {
                case 'playerCreated':
                    document.__global_game.myUUID = data.player.uuid
                    document.__global_game.camera.position.set(data.player.x, data.player.y, data.player.z)
                    document.__global_game.updateStatus()
                    console.log('My UUID is:', document.__global_game.myUUID)
                    break

                case 'playersUpdate':
                    document.__global_game.updateRemotePlayers(data.players)
                    break

                default:
                    console.log('Received unknown players message type:', data)
                    break
            }
        } catch (e) {
            console.error('Failed to parse incoming players message:', e)
        }
    }

    onWsCubesMessage = (event) => {
        //try {
            const data = JSON.parse(event.data)
            switch (data.type) {
                case 'stateUpdate':
                    console.log('Received full state update. Synchronizing scene.')
                    const serverCubes = data.cubes

                    const clientCubeKeys = new Set(document.__global_game.cubes.keys())
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
                            const cubeData = serverCubes[key]
                            const hexColor = document.__global_game.intToHex(cubeData.color)
                            this.addCubeAt(cubeData.x, cubeData.y, cubeData.z, hexColor, false)
                        }
                    }

                    console.log(`Scene synchronized. Cubes on server: ${serverCubeKeys.size}. Cubes now on client: ${this.cubes.size}.`)
                    break

                default:
                    console.log('Received unknown cubes message type:', data)
                    break
            }

        // } catch (e) {
        //     console.error('Failed to parse incoming cubes message:', e)
        // }
    }

    sendAddCube = (x, y, z, hexColor) => {
        console.log(hexColor)
        if (document.__global_game.wsCubes?.readyState === document.__global_game.wsCubes?.OPEN) {
            document.__global_game.wsCubes.send(document.__global_game.js({
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

    sendRemoveCube = (x, y, z) => {
        if (document.__global_game.wsCubes?.readyState === document.__global_game.wsCubes?.OPEN) {
            document.__global_game.wsCubes.send(document.__global_game.js({
                method: 'removeCube',
                x: x,
                y: y,
                z: z
            }))
        } else {
            console.warn('Cubes server not connected. Cube removal not synchronized.')
        }
    }

    updateRemotePlayers = (serverPlayers) => {
        const receivedUUIDs = new Set()

        for (const uuid in serverPlayers) {
            const player = serverPlayers[uuid]
            receivedUUIDs.add(uuid)

            if (uuid === document.__global_game.myUUID) continue

                if (!document.__global_game.remotePlayers.has(uuid)) {
                    const mesh = new THREE.Mesh(document.__global_game.remotePlayerGeometry, document.__global_game.remotePlayerMaterial)
                    document.__global_game.scene.add(mesh)
                    document.__global_game.remotePlayers.set(uuid, { mesh })
                }

                const remotePlayer = document.__global_game.remotePlayers.get(uuid)
                if (remotePlayer) {
                    remotePlayer.mesh.position.set(player.x, player.y, player.z)
                }
        }

        const playersToRemove = []
        for (const [uuid, remotePlayer] of document.__global_game.remotePlayers.entries()) {
            if (!receivedUUIDs.has(uuid)) {
                playersToRemove.push(uuid)
                document.__global_game.scene.remove(remotePlayer.mesh)
            }
        }

        playersToRemove.forEach(uuid => {
            document.__global_game.remotePlayers.delete(uuid)
            console.log(`Removed remote player: ${uuid}`)
        })
    }

    connectWebSocket = () => {
        this.wsPlayers = new WebSocket(this.PLAYERS_WS_URL)
        this.wsPlayers.onopen = () => {
            this.updateStatus()
            this.wsPlayers.send(JSON.stringify({ method: 'addPlayer' }))
        }
        this.wsPlayers.onmessage = this.onWsPlayersMessage
        this.wsPlayers.onerror = this.updateStatus
        this.wsPlayers.onclose = () => {
            myUUID = null
            updateStatus()
        }

        this.wsCubes = new WebSocket(this.CUBES_WS_URL)
        this.wsCubes.onopen = this.updateStatus
        this.wsCubes.onmessage = this.onWsCubesMessage
        this.wsCubes.onerror = this.updateStatus
        this.wsCubes.onclose = this.updateStatus

        this.updateStatus()
    }

    intToHex(intColorString) {
        const intColor = parseInt(intColorString, 10)
        if (isNaN(intColor) || intColor < 0 || intColor > 0xFFFFFF) {
            return '#ffffff'
        }
        return '#' + intColor.toString(16).padStart(6, '0')
    }

    js(object) {
        return JSON.stringify(object)
    }

    handleCameraRotation(x, y) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ')
        const PI_2 = Math.PI / 2
        const movementX = x || 0
        const movementY = y || 0
        euler.setFromQuaternion(this.camera.quaternion)
        euler.y -= movementX * 0.002
        euler.x -= movementY * 0.002
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x))
        this.camera.quaternion.setFromEuler(euler)
    }

    clearScene() {
        cubes.forEach((value, key) => {
            removeCubeAt(value.position.x, value.position.y, value.position.z)
        })
        cubes.clear()
        signalCubes.clear()
        nandCubes.clear()
    }

    isThereCubeAt(x, y, z) {
        return this.cubes.has(document.__global_game.js([x, y, z]))
    }

    addCubeAt(x, y, z, hex, broadcast = true) {
        console.log(hex)
        const hexColor = new THREE.Color(hex).getHex()
        const material = new THREE.MeshLambertMaterial({ color: hexColor })
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)

        cube.position.x = x
        cube.position.y = y
        cube.position.z = z

        this.scene.add(cube)

        this.cubes.set(this.js([x, y, z]), cube)

        if (broadcast) {
            this.sendAddCube(x, y, z, hex)
        }
    }

    removeCubeAt(x, y, z, broadcast = true) {
        const cube = document.__global_game.cubes.get(document.__global_game.js([x, y, z]))
        document.__global_game.scene.remove(cube)
        document.__global_game.cubes.delete(document.__global_game.js([x, y, z]))
        document.__global_game.nandCubes.delete(document.__global_game.js([x, y, z]))
        document.__global_game.signalCubes.delete(document.__global_game.js([x, y, z]))
        if (broadcast) {
            document.__global_game.sendRemoveCube(x, y, z)
        }
    }

    toggleCubeAt(x, y, z, hex) {
        if (document.__global_game.isThereCubeAt(x, y, z)) {
            document.__global_game.removeCubeAt(x, y, z)
        }
        else {
            document.__global_game.addCubeAt(x, y, z, hex)
        }
    }

    toggleCubeInFront() {
        const distance = 3;
        const dir = new THREE.Vector3()
        document.__global_game.camera.getWorldDirection(dir)

        const position = new THREE.Vector3()
        position.copy(document.__global_game.camera.position).add(dir.multiplyScalar(distance))

        position.x = Math.round(position.x)
        position.y = Math.round(position.y)
        position.z = Math.round(position.z)

        const hexColor = new THREE.Color(document.__global_game.options.cubeColor).getHex()

        document.__global_game.toggleCubeAt(position.x, position.y, position.z, hexColor)
    }

    step() {
        const self = document.__global_game
        requestAnimationFrame(document.__global_game.step)

        const delta = self.clock.getDelta()

        self.direction.z = Number(self.move.forward) - Number(self.move.backward)
        self.direction.x = Number(self.move.right) - Number(self.move.left)
        self.direction.normalize();

        self.handleCameraRotation(self.rightJoystick.normalizedX * 10, -self.rightJoystick.normalizedY * 10)

        if (
            self.controls.isLocked ||
            self.leftJoystick.isDragging ||
            self.rightJoystick.isDragging
        ) {
            self.velocity.x = self.direction.x * self.options.speed * delta
            self.velocity.z = self.direction.z * self.options.speed * delta
            self.velocity.y = self.move.up ? self.options.speed * delta : 0
            if (!self.move.up) {
                self.velocity.y = self.move.down ? -self.options.speed * delta : 0
            }

            self.controls.moveRight(self.velocity.x)
            self.controls.moveForward(self.velocity.z)
            self.camera.position.y += self.velocity.y
        }

        const now = Date.now()
        if (
            self.wsPlayers &&
            self.wsPlayers.readyState === self.wsPlayers.OPEN &&
            self.myUUID &&
            now - self.lastMoveSendTime > self.PLAYER_MOVE_SEND_INTERVAL_MS
        ) {
            const currentPos = self.camera.position

            if (!self.lastSentPosition.equals(currentPos)) {
                document.__global_game.wsPlayers.send(JSON.stringify({
                    method: 'playerMove',
                    playerUUID: document.__global_game.myUUID,
                    x: currentPos.x,
                    y: currentPos.y,
                    z: currentPos.z
                }))
                self.lastSentPosition.copy(currentPos)
                self.lastMoveSendTime = now
            }
        }

        const dir = new THREE.Vector3()
        self.camera.getWorldDirection(dir)
        const pos = new THREE.Vector3().copy(self.camera.position).add(dir.multiplyScalar(3))
        pos.x = Math.round(pos.x)
        pos.y = Math.round(pos.y)
        pos.z = Math.round(pos.z)
        self.cursorCube.position.copy(pos)
        self.cursorMaterial.color.set(self.options.cubeColor)
        self.cursorMaterial.opacity = self.options.cursorVisible ? 0.5 : 0.0
        self.cursorMaterial.visible = self.options.cursorVisible

        self.renderer.setClearColor(self.options.backgroundColor)
        self.renderer.render(self.scene, self.camera)

        self.leftJoystick.draw(self.options)
        self.rightJoystick.draw(self.options)
    }

    translateGUI() {
        colorController.name(i18n[options.language].cubeColor)
        cursorController.name(i18n[options.language].showCursor)
        backgroundColorController.name(i18n[options.language].background)
        speedController.name(i18n[options.language].moveSpeed)
        saveController.name(i18n[options.language].saveScene)
        langController.name(i18n[options.language].Language)
        langController.updateDisplay()
    }

    saveSceneToFile() {
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

    positionMenu = () => {
        if (!fullMenu) {
            if (window.innerWidth / window.innerHeight < 1) {
                document.getElementsByClassName("lil-gui")[0].style.scale =  window.innerWidth < 400 ? 1 : 2
                document.getElementsByClassName("lil-gui")[0].style.right = window.innerWidth < 400 ? 1 : 150
            } else {
                document.getElementsByClassName("lil-gui")[0].style.scale = 1
                document.getElementsByClassName("lil-gui")[0].style.right = "0px"
            }
        }
    }
}

const game = new Game()
game.start()
