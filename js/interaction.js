// js/interaction.js - 準心 Raycast 檢測與互動模組

const raycaster = new THREE.Raycaster();
const centerPoint = new THREE.Vector2(0, 0);

export let currentTarget = null;
export let heldBox = null;

export function updateRaycast(camera, interactables, scene) {
    raycaster.setFromCamera(centerPoint, camera);
    const intersects = raycaster.intersectObjects(interactables, true);

    const crosshair = document.getElementById('crosshair');
    const promptText = document.getElementById('prompt-text');
    const btnInteract = document.getElementById('btn-interact');

    if (intersects.length > 0 && intersects[0].distance < 3.5) {
        const hitObj = intersects[0].object;

        let rootObj = hitObj;
        while (rootObj.parent && rootObj.parent !== scene && !rootObj.name) {
            rootObj = rootObj.parent;
        }
        const targetType = rootObj.name || hitObj.name;

        let text = null;
        if (targetType === "box" && !heldBox) {
            const left = rootObj.userData.itemsLeft ?? 5;
            text = `[拿起] ${rootObj.userData.itemName || '紙箱'} (剩 ${left} 件)`;
        } else if (targetType === "shelf") {
            text = heldBox
                ? `[補貨] 將 ${heldBox.userData.itemName} 上架 (庫存 ${rootObj.userData.stockedCount})`
                : `貨架 (庫存 ${rootObj.userData.stockedCount})`;
        } else if (targetType === "counter") {
            text = `[開啟] 收銀 POS 系統`;
        } else if (targetType === "computer") {
            text = `[開啟] 商品訂購電腦`;
        } else if (targetType === "sign") {
            text = `[切換] 開店 / 打烊`;
        }

        if (text) {
            currentTarget = { object: rootObj, hitMesh: hitObj, type: targetType };
            crosshair.classList.add('active');
            promptText.innerText = text;
            promptText.style.display = 'block';
            btnInteract.style.display = 'block'; // 對準物品時顯示互動按鈕
        } else {
            hideInteraction();
        }
    } else {
        hideInteraction();
    }
}

function hideInteraction() {
    document.getElementById('crosshair').classList.remove('active');
    document.getElementById('prompt-text').style.display = 'none';
    document.getElementById('btn-interact').style.display = 'none';
    currentTarget = null;
}

export function pickUpBox(box, camera, interactables) {
    heldBox = box;
    camera.add(heldBox);
    heldBox.position.set(0.3, -0.3, -0.8);
    heldBox.rotation.set(0, 0, 0);

    const idx = interactables.indexOf(box);
    if (idx > -1) interactables.splice(idx, 1);

    document.getElementById('btn-drop').style.display = 'block';
}

export function dropBox(camera, scene, interactables) {
    if (heldBox) {
        scene.add(heldBox); // add 會自動把它從相機底下移走
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        heldBox.position.copy(camera.position).add(forward.multiplyScalar(1.2));
        heldBox.position.y = 0.25;
        heldBox.rotation.set(0, 0, 0);

        interactables.push(heldBox);
        heldBox = null;
        document.getElementById('btn-drop').style.display = 'none';
    }
}

// 紙箱用完後直接丟棄 (不放回場景)
export function discardHeldBox(camera) {
    if (heldBox) {
        camera.remove(heldBox);
        heldBox = null;
        document.getElementById('btn-drop').style.display = 'none';
    }
}
