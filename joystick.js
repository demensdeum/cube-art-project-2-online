export class Joystick {
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
