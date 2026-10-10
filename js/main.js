// js/main.js - 核心整合與主邏輯

import { initControls, moveDir, cameraYaw, cameraPitch } from './controls.js';
import { updateRaycast, currentTarget, heldBox, pickUpBox, dropBox } from './interaction.js';
import { openPOS, closePOS } from './pos.js';
import { openOrderUI, closeOrderUI, addToCart, checkoutOrder } from './order.js';

let money = 100.00;
let inUI = false;

// 1. 初始化 Three.js 場景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));
scene.add(new THREE.GridHelper(20, 20));

// 2. 物件與模型載入
const loader = new THREE.GLTFLoader();
const interactables = [];

// (1) 貨架
loader.load('shelf.glb', (gltf) => {
    const shelf = gltf.scene;
    shelf.position.set(-3, 0, -1);
    shelf.name = "shelf";
    shelf.userData = { stockedCount: 0 };
    shelf.traverse(c => { if (c.isMesh) { c.name = "shelf"; interactables.push(c); } });
    scene.add(shelf);
}, undefined, () => {
    const shelfMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 3), new THREE.MeshLambertMaterial({ color: 0x335588 }));
    shelfMesh.position.set(-3, 1, -1);
    shelfMesh.name = "shelf";
    shelfMesh.userData = { stockedCount: 0 };
    scene.add(shelfMesh);
    interactables.push(shelfMesh);
});

// (2) 收銀檯
loader.load('counter.glb', (gltf) => {
    const counter = gltf.scene;
    counter.position.set(2, 0, 1);
    counter.name = "counter";
    counter.traverse(c => { if (c.isMesh) { c.name = "counter"; interactables.push(c); } });
    scene.add(counter);
}, undefined, () => {
    const counterMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1), new THREE.MeshLambertMaterial({ color: 0xddaa22 }));
    counterMesh.position.set(2, 0.5, 1);
    counterMesh.name = "counter";
    scene.add(counterMesh);
    interactables.push(counterMesh);
});

// (3) 電腦 (訂購用)
const compMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshLambertMaterial({ color: 0x00aa88 }));
compMesh.position.set(2, 1.2, -2);
compMesh.name = "computer";
scene.add(compMesh);
interactables.push(compMesh);

// 紙箱生成函數
function spawnBox(name, x, z) {
    loader.load('box.glb', (gltf) => {
        const box = gltf.scene;
        box.position.set(x, 0, z);
        box.name = "box";
        box.userData = { itemName: name, itemsLeft: 5 };
        box.traverse(c => { if (c.isMesh) c.name = "box"; });
        scene.add(box);
        interactables.push(box);
    }, undefined, () => {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshLambertMaterial({ color: 0xc2b280 }));
        box.position.set(x, 0.25, z);
        box.name = "box";
        box.userData = { itemName: name, itemsLeft: 5 };
        scene.add(box);
        interactables.push(box);
    });
}
spawnBox("初始牛奶箱", 0, 0);

// 3. 初始化控制系統
initControls();

// 4. 按鈕事件綁定
document.getElementById('btn-interact').onclick = () => {
    if (!currentTarget) return;
    const { type, object } = currentTarget;

    if (type === "box" && !heldBox) {
        pickUpBox(object, camera, interactables);
    } else if (type === "shelf" && heldBox) {
        if (heldBox.userData.itemsLeft > 0) {
            heldBox.userData.itemsLeft--;
            const item = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: 0xff0000 }));
            item.position.set((Math.random() - 0.5) * 1, 0.5, (Math.random() - 0.5) * 1);
            object.add(item);
        }
    } else if (type === "counter") {
        inUI = true;
        openPOS((earned) => {
            money += earned;
            document.getElementById('money-text').innerText = money.toFixed(2);
            inUI = false;
        });
    } else if (type === "computer") {
        inUI = true;
        openOrderUI();
    }
};

document.getElementById('btn-drop').onclick = () => dropBox(camera, scene, interactables);

// 電腦訂購介面按鈕事件
document.getElementById('btn-buy-milk').onclick = () => addToCart('牛奶箱', 20);
document.getElementById('btn-buy-chips').onclick = () => addToCart('洋芋片箱', 15);
document.getElementById('btn-buy-drink').onclick = () => addToCart('飲料箱', 18);
document.getElementById('btn-order-checkout').onclick = () => {
    money = checkoutOrder(money, spawnBox);
    document.getElementById('money-text').innerText = money.toFixed(2);
};
document.getElementById('btn-close-order').onclick = () => { closeOrderUI(); inUI = false; };
document.getElementById('btn-close-pos').onclick = () => { closePOS(); inUI = false; };

// 5. 遊戲主循環
function animate() {
    requestAnimationFrame(animate);

    if (!inUI) {
        const speed = 0.08;
        const forwardX = -Math.sin(cameraYaw);
        const forwardZ = -Math.cos(cameraYaw);
        const rightX = Math.cos(cameraYaw);
        const rightZ = -Math.sin(cameraYaw);

        camera.position.x += (forwardX * (-moveDir.y) + rightX * moveDir.x) * speed;
        camera.position.z += (forwardZ * (-moveDir.y) + rightZ * moveDir.x) * speed;

        const euler = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);

        updateRaycast(camera, interactables, scene);
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});