// js/main.js - 超市模擬器核心邏輯

import { initControls, moveDir, cameraYaw, cameraPitch } from './controls.js';
import { updateRaycast, currentTarget, heldBox, pickUpBox, dropBox, discardHeldBox } from './interaction.js';
import { openPOS, closePOS } from './pos.js';
import { openOrderUI, closeOrderUI, addToCart, checkoutOrder } from './order.js';

// 小工具：綁定按鈕。找不到元素時只在 console 警告，不會讓整支程式中斷
function bind(id, handler) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[main.js] 找不到元素 #${id}，已略過綁定`);
        return;
    }
    el.onclick = handler;
}

// 不會卡住畫面的提示訊息 (取代 alert)
function showToast(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;top:25%;transform:translateX(-50%);background:rgba(0,0,0,.8);' +
        'color:#fff;padding:10px 18px;border-radius:14px;font-size:16px;z-index:50;pointer-events:none;' +
        'max-width:80vw;text-align:center;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

const moneyText = document.getElementById('money-text');
function setMoney(v) {
    money = v;
    if (moneyText) moneyText.innerText = money.toFixed(2);
}

let money = (window.playerSaveData && typeof window.playerSaveData.money === 'number')
    ? window.playerSaveData.money : 100.00;
let inUI = false;
let isStoreOpen = false;         // 店鋪營業狀態
let activeCustomer = null;       // 當前在收銀檯前的顧客物件
let customerQueueItems = [];     // 顧客帶來的商品清單

// 1. 初始化 Three.js 場景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5);
scene.add(camera); // 相機必須加入場景，手上拿的紙箱 (相機的子物件) 才會被畫出來

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 燈光：Lambert 材質需要光才看得到顏色
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 5);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// 地板 + 格線
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshLambertMaterial({ color: 0xdcdcdc })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const grid = new THREE.GridHelper(20, 20, 0x999999, 0xbbbbbb);
grid.position.y = 0.01;
scene.add(grid);

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
bind('btn-interact', () => {
    if (inUI || !currentTarget) return;
    const { type, object } = currentTarget;

    if (type === "box" && !heldBox) {
        pickUpBox(object, camera, interactables);
    } else if (type === "shelf" && heldBox) {
        if (heldBox.userData.itemsLeft > 0) {
            heldBox.userData.itemsLeft--;
            shelfMesh.userData.stockedCount++;
            showToast(`已上架 ${heldBox.userData.itemName}，貨架庫存 ${shelfMesh.userData.stockedCount}`);
            if (heldBox.userData.itemsLeft === 0) {
                discardHeldBox(camera); // 紙箱空了，自動丟掉
            }
        }
    } else if (type === "sign") {
        isStoreOpen = !isStoreOpen;
        signMesh.material.color.set(isStoreOpen ? 0x00ff00 : 0xff0000);
        showToast(isStoreOpen ? "🟢 超市已開門營業！" : "🔴 超市已打烊。");
    } else if (type === "counter") {
        if (customerQueueItems.length === 0) {
            showToast("收銀檯目前沒有顧客放置商品！");
            return;
        }
        inUI = true;
        openPOS(customerQueueItems, (earned) => {
            setMoney(money + earned);

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
});

bind('btn-drop', () => dropBox(camera, scene, interactables));

// 電腦選單事件綁定
bind('btn-buy-milk', () => addToCart('牛奶箱', 20));
bind('btn-buy-chips', () => addToCart('洋芋片箱', 15));
bind('btn-buy-drink', () => addToCart('飲料箱', 18));
bind('btn-order-checkout', () => {
    setMoney(checkoutOrder(money, spawnBox));
});
bind('btn-close-order', () => { closeOrderUI(); inUI = false; });
bind('btn-close-pos', () => { closePOS(); inUI = false; });

// 5. 顧客生成邏輯
let customerTimer = 0;
function updateCustomers(delta) {
    if (!isStoreOpen || activeCustomer !== null) return;

    customerTimer += delta;
    if (customerTimer > 6 && shelfMesh.userData.stockedCount > 0) {
        customerTimer = 0;
        shelfMesh.userData.stockedCount--;

        // 3D 顧客模型 (膠囊體)。r128 沒有 CapsuleGeometry，改用圓柱 + 球組合
        const customer = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: 0xff6699 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), mat);
        body.position.y = 0;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), mat);
        head.position.y = 0.8;
        customer.add(body, head);
        customer.position.set(2, 0.6, 3);
        scene.add(customer);
        activeCustomer = customer;

        // 隨機讓顧客選購 1 到 3 件商品放在收銀檯上
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const prices = [10, 15, 20, 25, 30];
        customerQueueItems = [];
        for (let i = 0; i < itemCount; i++) {
            const p = prices[Math.floor(Math.random() * prices.length)];
            customerQueueItems.push({ name: `商品 #${i + 1}`, price: p });
        }

        showToast("🔔 有顧客把商品放上櫃台了！去收銀檯按互動幫他結帳。");
    }
}

// 6. 遊戲主循環
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (!inUI) {
        const speed = 4.5 * delta;
        const forwardX = -Math.sin(cameraYaw);
        const forwardZ = -Math.cos(cameraYaw);
        const rightX = Math.cos(cameraYaw);
        const rightZ = -Math.sin(cameraYaw);

        camera.position.x += (forwardX * (-moveDir.y) + rightX * moveDir.x) * speed;
        camera.position.z += (forwardZ * (-moveDir.y) + rightZ * moveDir.x) * speed;
        // 限制在場地範圍內
        camera.position.x = Math.max(-9.5, Math.min(9.5, camera.position.x));
        camera.position.z = Math.max(-9.5, Math.min(9.5, camera.position.z));

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
