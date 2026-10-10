// js/order.js - 電腦進貨訂購選單系統

let cart = [];
let cartTotal = 0;

export function openOrderUI() {
    document.getElementById('order-ui').style.display = 'flex';
}

export function closeOrderUI() {
    document.getElementById('order-ui').style.display = 'none';
}

export function addToCart(itemName, price) {
    cart.push({ name: itemName, price: price });
    cartTotal += price;
    updateCartUI();
}

function updateCartUI() {
    const listEl = document.getElementById('cart-list');
    if (cart.length === 0) {
        listEl.innerText = "已選清單: 無";
    } else {
        listEl.innerHTML = cart.map(item => `<div>• ${item.name} - $${item.price}</div>`).join('');
    }
    document.getElementById('order-total').innerText = `總計: $${cartTotal}.00`;
}

export function checkoutOrder(currentMoney, spawnBoxCallback) {
    if (cart.length === 0) { alert('購物車是空的！'); return currentMoney; }
    if (currentMoney < cartTotal) { alert('金錢不足！'); return currentMoney; }

    const newMoney = currentMoney - cartTotal;

    // 下單成功，在門口生成相應的紙箱
    cart.forEach((item, index) => {
        spawnBoxCallback(item.name, 1 + index * 0.8, 3);
    });

    alert(`成功進貨！${cart.length} 個紙箱已送到門口外。`);

    cart = [];
    cartTotal = 0;
    updateCartUI();
    closeOrderUI();

    return newMoney;
}