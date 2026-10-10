// js/pos.js - POS 收銀結帳系統

export function openPOS(onFinishCheckout) {
    document.getElementById('pos-ui').style.display = 'flex';
    const total = (Math.floor(Math.random() * 5) + 1) * 5;

    document.getElementById('pos-total').innerText = `總計: $${total}.00`;
    document.getElementById('checkout-action-area').innerHTML = `
        <button id="btn-finish-pos" class="modal-btn" style="background:#00aa00; color:white;">完成結帳</button>
    `;

    document.getElementById('btn-finish-pos').onclick = () => {
        onFinishCheckout(total);
        closePOS();
    };
}

export function closePOS() {
    document.getElementById('pos-ui').style.display = 'none';
}