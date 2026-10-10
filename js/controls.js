// js/controls.js - 搖桿與視角控制模組

export let moveDir = { x: 0, y: 0 };
export let cameraYaw = 0;
export let cameraPitch = 0;

export function initControls() {
    // 1. 虛擬搖桿邏輯
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    let joystickTouchId = null;

    zone.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        joystickTouchId = e.changedTouches[0].identifier;
    });

    zone.addEventListener('touchmove', (e) => {
        e.stopPropagation();
        for (let t of e.changedTouches) {
            if (t.identifier === joystickTouchId) {
                const rect = zone.getBoundingClientRect();
                let x = t.clientX - rect.left - 70;
                let y = t.clientY - rect.top - 70;
                const dist = Math.hypot(x, y);
                if (dist > 45) { x = (x / dist) * 45; y = (y / dist) * 45; }
                knob.style.transform = `translate(${x}px, ${y}px)`;
                moveDir.x = x / 45;
                moveDir.y = y / 45;
            }
        }
    });

    const resetJoystick = (e) => {
        e.stopPropagation();
        knob.style.transform = `translate(0px, 0px)`;
        moveDir.x = 0;
        moveDir.y = 0;
        joystickTouchId = null;
    };
    zone.addEventListener('touchend', resetJoystick);
    zone.addEventListener('touchcancel', resetJoystick);

    // 2. 右側觸控旋轉視角
    let lookTouchId = null;
    let previousTouchX = 0, previousTouchY = 0;

    window.addEventListener('touchstart', (e) => {
        for (let t of e.changedTouches) {
            if (t.clientX > window.innerWidth / 3 && lookTouchId === null) {
                lookTouchId = t.identifier;
                previousTouchX = t.clientX;
                previousTouchY = t.clientY;
            }
        }
    });

    window.addEventListener('touchmove', (e) => {
        for (let t of e.changedTouches) {
            if (t.identifier === lookTouchId) {
                const deltaX = t.clientX - previousTouchX;
                const deltaY = t.clientY - previousTouchY;
                cameraYaw -= deltaX * 0.005;
                cameraPitch -= deltaY * 0.005;
                cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraPitch));
                previousTouchX = t.clientX;
                previousTouchY = t.clientY;
            }
        }
    });

    const resetLook = (e) => {
        for (let t of e.changedTouches) {
            if (t.identifier === lookTouchId) lookTouchId = null;
        }
    };
    window.addEventListener('touchend', resetLook);
    window.addEventListener('touchcancel', resetLook);
}