// js/pos.js - POS 收銀結帳系統 (包含刷卡九宮格與付現找零機制)

let currentTotal = 0;
let paymentMethod = 'card'; // 'card' 或 'cash'
let cardInput = "";         // 刷卡九宮格輸入值
let cashGiven = 0;          // 顧客給的現金
let changeNeeded = 0;       // 需要找給顧客的金額
let changeGiven = 0;        // 玩家目前已經找的金額
let onCheckoutSuccessCallback = null;

export function openPOS(onFinishCheckout) {
    onCheckoutSuccessCallback = onFinishCheckout;
    document.getElementById('pos-ui').style.display = 'flex';

    // 1. 隨機生成結帳總金額 ($5 ~ $100)
    currentTotal = (Math.floor(Math.random() * 20) + 1) * 5;

    // 2. 隨機選擇付款方式 (刷卡 50% / 付現 50%)
    paymentMethod = Math.random() > 0.5 ? 'card' : 'cash';

    document.getElementById('pos-total').innerText = `總計: $${currentTotal}.00`;
    document.getElementById('pos-mode').innerText = `付款方式: ${paymentMethod === 'card' ? '💳 刷卡' : '💵 現金'}`;

    // 3. 根據付款方式渲染對應介面
    if (paymentMethod === 'card') {
        setupCardUI();
    } else {
        setupCashUI();
    }
}

// ==========================================
// A. 刷卡模式：數字九宮格介面
// ==========================================
function setupCardUI() {
    cardInput = "";
    const actionArea = document.getElementById('checkout-action-area');

    actionArea.innerHTML = `
        <div style="margin: 10px 0;">
            <div style="font-size: 14px; color: #aaa;">請輸入刷卡扣款金額：</div>
            <div id="card-display" style="font-size: 28px; font-weight: bold; color: #00ff00; background: #000; padding: 10px; border-radius: 5px; margin: 5px 0;">$0</div>
        </div>
        <!-- 九宮格鍵盤 -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 240px; margin: 0 auto;">
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('1')">1</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('2')">2</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('3')">3</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('4')">4</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('5')">5</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('6')">6</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('7')">7</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('8')">8</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('9')">9</button>
            <button class="modal-btn keypad-btn" style="background: #ff4444; color: white;" onclick="window.posKeypad('C')">清除</button>
            <button class="modal-btn keypad-btn" onclick="window.posKeypad('0')">0</button>
            <button class="modal-btn keypad-btn" style="background: #00aa00; color: white;" onclick="window.posKeypad('OK')">確認</button>
        </div>
    `;
}

// 處理九宮格按鈕點擊
window.posKeypad = function (val) {
    const display = document.getElementById('card-display');
    if (val === 'C') {
        cardInput = "";
    } else if (val === 'OK') {
        if (parseInt(cardInput || "0") === currentTotal) {
            alert('💳 刷卡成功！');
            finishTransaction();
        } else {
            alert(`❌ 金額不正確！需要刷卡金額為 $${currentTotal}`);
            cardInput = "";
        }
    } else {
        if (cardInput.length < 5) cardInput += val;
    }
    if (display) display.innerText = `$${cardInput || "0"}`;
};

// ==========================================
// B. 付現模式：找零（Zhao）機制介面
// ==========================================
function setupCashUI() {
    // 顧客給的錢會是大於或等於總額的整數鈔票 (例如：$100、$50、或恰好)
    const options = [currentTotal, currentTotal + 5, currentTotal + 10, currentTotal + 50, 100];
    cashGiven = options.filter(v => v >= currentTotal)[Math.floor(Math.random() * (options.filter(v => v >= currentTotal).length))];
    changeNeeded = cashGiven - currentTotal;
    changeGiven = 0;

    updateCashUI();
}

function updateCashUI() {
    const actionArea = document.getElementById('checkout-action-area');

    actionArea.innerHTML = `
        <div style="background: #333; padding: 10px; border-radius: 8px; margin: 10px 0; text-align: left; font-size: 15px;">
            <div>💵 顧客支付：<b style="color:#00ff00;">$${cashGiven}.00</b></div>
            <div>🪙 需找零金額：<b style="color:#ffbb00;">$${changeNeeded}.00</b></div>
            <div>已找金額：<b style="color:#00e5ff;">$${changeGiven}.00</b></div>
        </div>

        <div style="margin-bottom: 10px; font-size: 14px; color: #aaa;">點擊面額找錢給顧客：</div>
        <!-- 找零面額按鈕 -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;">
            <button class="modal-btn" style="background:#ff9900; color:black; padding:8px;" onclick="window.addChange(1)">+$1</button>
            <button class="modal-btn" style="background:#ff9900; color:black; padding:8px;" onclick="window.addChange(5)">+$5</button>
            <button class="modal-btn" style="background:#ff9900; color:black; padding:8px;" onclick="window.addChange(10)">+$10</button>
            <button class="modal-btn" style="background:#ff9900; color:black; padding:8px;" onclick="window.addChange(50)">+$50</button>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="modal-btn" style="background: #888; color: white;" onclick="window.resetChange()">重設找錢</button>
            <button class="modal-btn" style="background: #00aa00; color: white;" onclick="window.confirmChange()">完成找零</button>
        </div>
    `;
}

// 找錢面額按鈕邏輯
window.addChange = function (amount) {
    changeGiven += amount;
    updateCashUI();
};

window.resetChange = function () {
    changeGiven = 0;
    updateCashUI();
};

window.confirmChange = function () {
    if (changeGiven === changeNeeded) {
        alert('💵 找零正確，結帳完成！');
        finishTransaction();
    } else if (changeGiven < changeNeeded) {
        alert(`❌ 找錢不夠！還需要找 $${changeNeeded - changeGiven}`);
    } else {
        alert(`❌ 找錢找太多了！多找了 $${changeGiven - changeNeeded}`);
    }
};

// 完成交易並發放收益
function finishTransaction() {
    if (onCheckoutSuccessCallback) {
        onCheckoutSuccessCallback(currentTotal);
    }
    closePOS();
}

export function closePOS() {
    document.getElementById('pos-ui').style.display = 'none';
}