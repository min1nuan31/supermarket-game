// js/main.js - 完整超市模擬器核心邏輯 (含 3D 顧客與逐項點擊計價)

import { initControls, moveDir, cameraYaw, cameraPitch } from './controls.js';
import { updateRaycast, currentTarget, heldBox, pickUpBox, dropBox } from './interaction.js';
import { openPOS, closePOS } from './pos.js';
import { openOrderUI, closeOrderUI, addToCart, checkoutOrder } from './order.js';

let money = 100.00;
let inUI = false;
let isStoreOpen = false;         // 店鋪營業狀態
let activeCustomer = null;       // 當前在收銀檯前的顧客物件
let customerQueueItems = [];     // 顧客帶來的商品清單

// 1. 初始化 Three.js 場景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.DirectionalLight(0xffffff, 1).translateX(5).translateY(10));
scene.add(new THREE.AmbientLight(0x404040));
scene.add(new THREE.GridHelper(20, 20));

const loader = new THREE.GLTFLoader();
const interactables = [];

// 2. 放置核心店面物件
// (1) 貨架
const shelfMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 3), new THREE.MeshLambertMaterial({ color: 0x335588 }));
shelfMesh.position.set(-3, 1, -1);
shelfMesh.name = "shelf";
shelfMesh.userData = { stockedCount: 5 }; // 預設有商品可供顧客拿
scene.add(shelfMesh);
interactables.push(shelfMesh);

// (2) 收銀檯
const counterMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1), new THREE.MeshLambertMaterial({ color: 0xddaa22 }));
counterMesh.position.set(2, 0.5, 1);
counterMesh.name = "counter";
scene.add(counterMesh);
interactables.push(counterMesh);

// (3) 電腦 (進貨用)
const compMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshLambertMaterial({ color: 0x00aa88 }));
compMesh.position.set(2, 1.2, -2);
compMesh.name = "computer";
scene.add(compMesh);
interactables.push(compMesh);

// (4) 開店招牌
const signMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), new THREE.MeshLambertMaterial({ color: 0xff0000 }));
signMesh.position.set(0, 1.5, -3);
signMesh.name = "sign";
scene.add(signMesh);
interactables.push(signMesh);

// 紙箱生成函數
function spawnBox(name, x, z) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshLambertMaterial({ color: 0xc2b280 }));
    box.position.set(x, 0.25, z);
    box.name = "box";
    box.userData = { itemName: name, itemsLeft: 5 };
    scene.add(box);
    interactables.push(box);
}
spawnBox("牛奶箱", 0, 0);

// 3. 初始化控制器
initControls();

// 4. 按鈕互動事件
document.getElementById('btn-interact').onclick = () => {
    if (!currentTarget) return;
    const { type, object } = currentTarget;

    if (type === "box" && !heldBox) {
        pickUpBox(object, camera, interactables);
    } else if (type === "shelf" && heldBox) {
        if (heldBox.userData.itemsLeft > 0) {
            heldBox.userData.itemsLeft--;
            shelfMesh.userData.stockedCount++;
        }
    } else if (type === "sign") {
        isStoreOpen = !isStoreOpen;
        signMesh.material.color.set(isStoreOpen ? 0x00ff00 : 0xff0000);
        alert(isStoreOpen ? "🟢 超市已開門營業！" : "🔴 超市已打烊。");
    } else if (type === "counter") {
        if (customerQueueItems.length === 0) {
            alert("收銀檯目前沒有顧客放置商品！");
            return;
        }
        // 走向收銀檯按下 E $\rightarrow$ 進入收銀特寫畫面（帶入顧客帶來的多樣商品）
        inUI = true;
        openPOS(customerQueueItems, (earned) => {
            money += earned;
            document.getElementById('money-text').innerText = money.toFixed(2);

            // 結帳完成，移除 3D 顧客模型
            if (activeCustomer) {
                scene.remove(activeCustomer);
                activeCustomer = null;
            }
            customerQueueItems = [];
            inUI = false;
        });
    } else if (type === "computer") {
        inUI = true;
        openOrderUI();
    }
};

document.getElementById('btn-drop').onclick = () => dropBox(camera, scene, interactables);

// 電腦選單事件綁定
document.getElementById('btn-buy-milk').onclick = () => addToCart('牛奶箱', 20);
document.getElementById('btn-buy-chips').onclick = () => addToCart('洋芋片箱', 15);
document.getElementById('btn-buy-drink').onclick = () => addToCart('飲料箱', 18);
document.getElementById('btn-order-checkout').onclick = () => {
    money = checkoutOrder(money, spawnBox);
    document.getElementById('money-text').innerText = money.toFixed(2);
};
document.getElementById('btn-close-order').onclick = () => { closeOrderUI(); inUI = false; };
document.getElementById('btn-close-pos').onclick = () => { closePOS(); inUI = false; };

// 5. 顧客生成與走動邏輯
let customerTimer = 0;
function updateCustomers(delta) {
    if (!isStoreOpen || activeCustomer !== null) return;

    customerTimer += delta;
    if (customerTimer > 6 && shelfMesh.userData.stockedCount > 0) {
        customerTimer = 0;
        shelfMesh.userData.stockedCount--;

        // 建立一個 3D 顧客模型 (用紅色/粉色膠囊或方塊代表)
        const customerGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const customerMat = new THREE.MeshLambertMaterial({ color: 0xff6699 });
        activeCustomer = new THREE.Mesh(customerGeo, customerMat);
        activeCustomer.position.set(2, 0.9, 3); // 從店門口出現
        scene.add(activeCustomer);

        // 隨機讓顧客選購 1 到 3 件商品放在收銀檯上
        const itemCount = Math.floor(Math.random() * 3) + 1;
        customerQueueItems = [];
        for (let i = 0; i < itemCount; i++) {
            const prices = [10, 15, 20, 25, 30];
            const p = prices[Math.floor(Math.random() * prices.length)];
            customerQueueItems.push({ name: `商品 #${i + 1}`, price: p });
        }

        alert("🔔 有顧客走到收銀檯前，將商品放上了櫃台！快去收銀檯按 E 幫他結帳。");
    }
}

// 6. 遊戲主循環
let clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (!inUI) {
        const speed = 0.08;
        const forwardX = -Math.sin(cameraYaw);
        const forwardZ = -Math.cos(cameraYaw);
        const rightX = Math.cos(cameraYaw);
        const rightZ = -Math.sin(cameraYaw);

        camera.position.x += (forwardX * (-moveDir.y) + rightX * moveDir.x) * speed;
        camera.position.z += (forwardZ * (-moveDir.y) + rightZ * moveDir.x) * speed;

        camera.quaternion.setFromEuler(new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ'));

        updateRaycast(camera, interactables, scene);
        updateCustomers(delta);
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});