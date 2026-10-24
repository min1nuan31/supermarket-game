// js/controls.js - 搖桿與視角控制模組 (手機觸控 + 電腦鍵鼠)

export let moveDir = { x: 0, y: 0 };
export let cameraYaw = 0;
export let cameraPitch = 0;

const JOY_RADIUS = 45;

function isUiTarget(el) {
    return !!(el && el.closest && el.closest('button, input, .modal-ui'));
}

function rotateView(dx, dy) {
    cameraYaw -= dx * 0.005;
    cameraPitch -= dy * 0.005;
    cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraPitch));
}

export function initControls() {
    // ========== 1. 動態虛擬搖桿 (左半螢幕，按哪裡就從哪裡出現) ==========
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    let joystickTouchId = null;
    let originX = 0, originY = 0;

    zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (joystickTouchId !== null) return;
        const t = e.changedTouches[0];
        joystickTouchId = t.identifier;
        originX = t.clientX;
        originY = t.clientY;
        knob.style.left = originX + 'px';
        knob.style.top = originY + 'px';
        knob.style.display = 'block';
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        for (const t of e.changedTouches) {
            if (t.identifier !== joystickTouchId) continue;
            let x = t.clientX - originX;
            let y = t.clientY - originY;
            const dist = Math.hypot(x, y);
            if (dist > JOY_RADIUS) { x = (x / dist) * JOY_RADIUS; y = (y / dist) * JOY_RADIUS; }
            knob.style.left = (originX + x) + 'px';
            knob.style.top = (originY + y) + 'px';
            moveDir.x = x / JOY_RADIUS;
            moveDir.y = y / JOY_RADIUS;
        }
    }, { passive: false });

    const resetJoystick = (e) => {
        e.stopPropagation();
        for (const t of e.changedTouches) {
            if (t.identifier !== joystickTouchId) continue;
            joystickTouchId = null;
            knob.style.display = 'none';
            moveDir.x = 0;
            moveDir.y = 0;
        }
    };
    zone.addEventListener('touchend', resetJoystick);
    zone.addEventListener('touchcancel', resetJoystick);

    // ========== 2. 右半螢幕觸控旋轉視角 ==========
    let lookTouchId = null;
    let prevX = 0, prevY = 0;

    window.addEventListener('touchstart', (e) => {
        for (const t of e.changedTouches) {
            if (lookTouchId === null && t.clientX > window.innerWidth / 2 && !isUiTarget(t.target)) {
                lookTouchId = t.identifier;
                prevX = t.clientX;
                prevY = t.clientY;
            }
        }
    });

    window.addEventListener('touchmove', (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === lookTouchId) {
                rotateView(t.clientX - prevX, t.clientY - prevY);
                prevX = t.clientX;
                prevY = t.clientY;
            }
        }
    });

    const resetLook = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === lookTouchId) lookTouchId = null;
        }
    };
    window.addEventListener('touchend', resetLook);
    window.addEventListener('touchcancel', resetLook);

    // ========== 3. 電腦測試用：WASD 移動、E 互動、Q 放下、滑鼠拖曳轉視角 ==========
    const keys = {};
    const updateKeyMove = () => {
        let x = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        let y = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
        const len = Math.hypot(x, y);
        if (len > 0) { x /= len; y /= len; }
        moveDir.x = x;
        moveDir.y = y;
    };

    window.addEventListener('keydown', (e) => {
        if (e.target && e.target.tagName === 'INPUT') return;
        const k = e.key.toLowerCase();
        if (k === 'e') {
            if (!e.repeat) document.getElementById('btn-interact').click();
        } else if (k === 'q') {
            if (!e.repeat) document.getElementById('btn-drop').click();
        } else if ('wasd'.includes(k) && k.length === 1) {
            keys[k] = true;
            updateKeyMove();
        }
    });
    window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if ('wasd'.includes(k) && k.length === 1) {
            keys[k] = false;
            updateKeyMove();
        }
    });

    let mouseDragging = false;
    window.addEventListener('mousedown', (e) => {
        if (isUiTarget(e.target)) return;
        mouseDragging = true;
    });
    window.addEventListener('mousemove', (e) => {
        if (mouseDragging) rotateView(e.movementX, e.movementY);
    });
    window.addEventListener('mouseup', () => { mouseDragging = false; });
}
