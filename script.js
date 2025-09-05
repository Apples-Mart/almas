// =================================================
// 1. إعدادات FIREBASE (باستخدام بياناتك)
// =================================================
// استخدام الدوال التي تم تحميلها في ملف HTML
const { initializeApp } = window.firebase;
const { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = window.firebase;
const { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot, doc, updateDoc, orderBy } = window.firebase;
const { getStorage, ref, uploadBytesResumable, getDownloadURL } = window.firebase;

// بيانات الإعداد الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyCfOzC8gkqkVSNZ3frtnnCMxbeq-v7yaTY",
    authDomain: "almas-store-a51eb.firebaseapp.com",
    databaseURL: "https://almas-store-a51eb-default-rtdb.firebaseio.com",
    projectId: "almas-store-a51eb",
    storageBucket: "almas-store-a51eb.appspot.com",
    messagingSenderId: "502522968593",
    appId: "1:502522968593:web:52dc253f8ea12f4d5bcfb0",
    measurementId: "G-G0WC9BJ6JW"
};

// تهيئة خدمات Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// =================================================
// 2. الوصول لعناصر الصفحة (DOM Elements) - لا تغيير هنا
// =================================================
const pages = {
    auth: document.getElementById('auth-page'),
    products: document.getElementById('products-page'),
    cart: document.getElementById('cart-page'),
    profile: document.getElementById('profile-page'),
};
const navLinks = {
    products: document.getElementById('nav-products'),
    cart: document.getElementById('nav-cart'),
    profile: document.getElementById('nav-profile'),
    logout: document.getElementById('nav-logout'),
};
const productListDiv = document.getElementById('product-list');
const cartItemsDiv = document.getElementById('cart-items');
const cartCountSpan = document.getElementById('cart-count');
const cartTotalSpan = document.getElementById('cart-total');
const userEmailSpan = document.getElementById('user-email');
const orderStatusDiv = document.getElementById('order-status');
const orderHistoryUl = document.getElementById('order-history');

// =================================================
// 3. متغيرات الحالة (State Variables) - لا تغيير هنا
// =================================================
let productsData = [];
let cart = [];
let currentUser = null;

// =================================================
// 4. إدارة العرض والتنقل بين الصفحات - لا تغيير هنا
// =================================================
function showPage(pageName) {
    Object.values(pages).forEach(page => page.style.display = 'none');
    pages[pageName].style.display = 'block';
}
navLinks.products.addEventListener('click', () => showPage('products'));
navLinks.cart.addEventListener('click', () => showPage('cart'));
navLinks.profile.addEventListener('click', () => showPage('profile'));
navLinks.logout.addEventListener('click', () => signOut(auth));


// =================================================
// 5. إدارة المصادقة (Authentication) - تم التحديث
// =================================================
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        userEmailSpan.textContent = user.email;
        navLinks.logout.style.display = 'inline';
        loadUserProfile();
        showPage('products');
    } else {
        currentUser = null;
        navLinks.logout.style.display = 'none';
        showPage('auth');
    }
});

document.getElementById('show-signup').addEventListener('click', () => { /* ... لا تغيير هنا ... */ });
document.getElementById('show-login').addEventListener('click', () => { /* ... لا تغيير هنا ... */ });

document.getElementById('signup-btn').addEventListener('click', () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .catch(error => alert(error.message));
});

document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => alert(error.message));
});

// =================================================
// 6. تحميل وعرض المنتجات - لا تغيير هنا
// =================================================
async function fetchProducts() { /* ... لا تغيير هنا ... */ }
function renderProducts() { /* ... لا تغيير هنا ... */ }


// =================================================
// 7. إدارة سلة المشتريات - لا تغيير هنا
// =================================================
function findProductById(sku) { /* ... لا تغيير هنا ... */ }
function addToCart(productSku) { /* ... لا تغيير هنا ... */ }
function updateCart() { /* ... لا تغيير هنا ... */ }


// =================================================
// 8. إتمام الطلب وإرساله إلى Firebase - تم التحديث
// =================================================
document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) return alert('سلتك فارغة!');
    if (!currentUser) {
        alert('الرجاء تسجيل الدخول أولاً لإتمام الطلب.');
        return showPage('auth');
    }
    const order = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price, 0),
        status: 'pending',
        createdAt: new Date()
    };
    try {
        const docRef = await addDoc(collection(db, "orders"), order);
        alert(`تم إرسال طلبك بنجاح! رقم الطلب: ${docRef.id}`);
        cart = [];
        updateCart();
        showPage('profile');
        loadUserProfile();
    } catch (error) {
        console.error("Error adding document: ", error);
    }
});

// =================================================
// 9. صفحة المستخدم الشخصية - تم التحديث
// =================================================
function loadUserProfile() {
    if (!currentUser) return;
    loadOrderHistory();
    listenForOrderUpdates();
}

async function loadOrderHistory() {
    orderHistoryUl.innerHTML = '';
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        const order = doc.data();
        const li = document.createElement('li');
        li.textContent = `طلب بتاريخ ${order.createdAt.toDate().toLocaleDateString()} - الإجمالي: ${order.total} جنيه - الحالة: ${translateStatus(order.status)}`;
        orderHistoryUl.appendChild(li);
    });
}

function listenForOrderUpdates() {
    orderStatusDiv.innerHTML = '';
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), where('status', 'in', ['pending', 'preparing']));
    onSnapshot(q, (snapshot) => {
        orderStatusDiv.innerHTML = '';
        snapshot.forEach((doc) => {
            // ... نفس منطق عرض الإشعارات من الكود السابق ...
        });
    });
}

function translateStatus(status) { /* ... لا تغيير هنا ... */ }
function createPaymentForm(orderId) { /* ... لا تغيير هنا ... */ }

function updatePaymentMethod(orderId, method) {
    const uploadDiv = document.getElementById(`payment-upload-${orderId}`);
    if (method === 'bank_transfer') {
        uploadDiv.style.display = 'block';
    } else {
        uploadDiv.style.display = 'none';
    }
    if (method === 'cash_on_delivery') {
        const orderRef = doc(db, "orders", orderId);
        updateDoc(orderRef, { paymentMethod: method, status: 'confirmed' })
            .then(() => alert('تم اختيار الدفع عند الاستلام.'));
    }
}

function uploadReceipt(orderId) {
    const file = document.getElementById(`receipt-file-${orderId}`).files[0];
    if (!file) return alert('الرجاء اختيار ملف.');

    const filePath = `receipts/${orderId}/${file.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => { /* يمكنك عرض نسبة التقدم هنا */ },
        (error) => { console.error(error); alert('فشل رفع الصورة.'); },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                const orderRef = doc(db, "orders", orderId);
                updateDoc(orderRef, {
                    paymentReceiptUrl: downloadURL,
                    status: 'payment_review'
                }).then(() => alert('تم رفع الإيصال بنجاح!'));
            });
        }
    );
}

// =================================================
// 10. بدء تشغيل التطبيق
// =================================================
document.addEventListener('DOMContentLoaded', () => {
    // الكود سيعمل تلقائياً بعد تحميل المكتبات
});


// قمت بإزالة بعض الدوال المكررة التي لا تغيير فيها للاختصار
// يمكنك نسخها من الكود السابق إذا لزم الأمر
// مثل fetchProducts, renderProducts, findProductById, addToCart, etc.
// سأقوم بإضافتها هنا كاملة للتأكيد
async function fetchProducts() {
    try {
        const response = await fetch('products.json');
        productsData = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}
function renderProducts() {
    productListDiv.innerHTML = '';
    productsData.forEach(item => {
        if (item.name && item.price) {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <h3>${item.name}</h3>
                <p>الفئة: ${item.category}</p>
                <p>السعر: ${item.price} جنيه</p>
                <button onclick="addToCart('${item.sku}')">أضف إلى السلة</button>
            `;
            productListDiv.appendChild(productCard);
        }
    });
}
function findProductById(sku) {
    return productsData.find(item => item.sku === sku);
}
function addToCart(productSku) {
    const product = findProductById(productSku);
    if (product) {
        cart.push(product);
        updateCart();
        alert(`${product.name} تمت إضافته إلى السلة!`);
    }
}
function updateCart() {
    cartItemsDiv.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>سلة المشتريات فارغة.</p>';
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `<span>${item.name}</span><span>${item.price} جنيه</span>`;
            cartItemsDiv.appendChild(cartItem);
            total += parseFloat(item.price);
        });
    }
    cartCountSpan.textContent = cart.length;
    cartTotalSpan.textContent = total.toFixed(2);
}
function translateStatus(status) {
    const statuses = {
        pending: 'قيد المراجعة',
        preparing: 'قيد التجهيز',
        shipped: 'تم الشحن',
        delivered: 'تم التوصيل',
        payment_review: 'قيد مراجعة الدفع',
        confirmed: 'مؤكد'
    };
    return statuses[status] || status;
}
function createPaymentForm(orderId) {
    return `
        <div class="payment-form">
            <p>اختر طريقة الدفع:</p>
            <select onchange="updatePaymentMethod('${orderId}', this.value)">
                <option value="">اختر...</option>
                <option value="cash_on_delivery">الدفع عند الاستلام</option>
                <option value="bank_transfer">تحويل بنكي</option>
            </select>
            <div id="payment-upload-${orderId}" style="display:none; margin-top:10px;">
                <p>يرجى تحويل المبلغ المطلوب وإرفاق صورة الوصل.</p>
                <input type="file" id="receipt-file-${orderId}">
                <button onclick="uploadReceipt('${orderId}')">تأكيد الدفع</button>
            </div>
        </div>
    `;
}
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCart();
    // Don't call showPage here, onAuthStateChanged will handle it.
});
document.getElementById('show-signup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
});
document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
});