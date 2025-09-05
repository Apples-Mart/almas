// =================================================
// 1. استيراد دوال FIREBASE V9
// =================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot, doc, updateDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";

// =================================================
// 2. إعدادات FIREBASE (باستخدام بياناتك)
// =================================================
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
// 3. الوصول لعناصر الصفحة (DOM Elements)
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
// 4. متغيرات الحالة (State Variables)
// =================================================
let productsData = [];
let cart = [];
let currentUser = null;

// =================================================
// 5. دوال مساعدة
// =================================================
function showPage(pageName) {
    Object.values(pages).forEach(page => page.style.display = 'none');
    pages[pageName].style.display = 'block';
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

// =================================================
// 6. إدارة المصادقة (Authentication)
// =================================================
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        userEmailSpan.textContent = user.email;
        navLinks.logout.style.display = 'inline';
        navLinks.profile.style.display = 'inline';
        navLinks.cart.style.display = 'inline';
        loadUserProfile();
        showPage('products');
    } else {
        currentUser = null;
        navLinks.logout.style.display = 'none';
        navLinks.profile.style.display = 'none';
        navLinks.cart.style.display = 'none';
        showPage('auth');
    }
});

// =================================================
// 7. تحميل وعرض المنتجات
// =================================================
async function fetchProducts() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error('Network response was not ok');
        productsData = await response.json();
        renderProducts();
    } catch (error) {
        console.error('فشل في تحميل المنتجات:', error);
        productListDiv.innerHTML = '<p>عفواً، حدث خطأ أثناء تحميل المنتجات.</p>';
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
                <p>الفئة: ${item.category || 'غير محدد'}</p>
                <p>السعر: ${item.price} جنيه</p>
                <button class="add-to-cart-btn" data-sku="${item.sku}">أضف إلى السلة</button>
            `;
            productListDiv.appendChild(productCard);
        }
    });
}

// =================================================
// 8. إدارة سلة المشتريات
// =================================================
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

// =================================================
// 9. صفحة المستخدم الشخصية
// =================================================
function loadUserProfile() {
    if (!currentUser) return;
    loadOrderHistory();
    listenForOrderUpdates();
}

async function loadOrderHistory() {
    orderHistoryUl.innerHTML = '<li>جار التحميل...</li>';
    try {
        const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        orderHistoryUl.innerHTML = '';
        if (querySnapshot.empty) {
            orderHistoryUl.innerHTML = '<li>لا يوجد طلبات سابقة.</li>';
        }
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const li = document.createElement('li');
            li.textContent = `طلب بتاريخ ${order.createdAt.toDate().toLocaleDateString()} - الإجمالي: ${order.total} جنيه - الحالة: ${translateStatus(order.status)}`;
            orderHistoryUl.appendChild(li);
        });
    } catch (error) {
        console.error("Error loading order history: ", error);
        orderHistoryUl.innerHTML = '<li>حدث خطأ في تحميل الطلبات.</li>';
    }
}

function listenForOrderUpdates() {
    orderStatusDiv.innerHTML = '';
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), where('status', 'in', ['pending', 'preparing']));
    onSnapshot(q, (snapshot) => {
        orderStatusDiv.innerHTML = '';
        if (snapshot.empty) {
            orderStatusDiv.innerHTML = '<p>لا توجد طلبات حالية قيد التجهيز.</p>';
        }
        snapshot.forEach((doc) => {
            const order = doc.data();
            const notification = document.createElement('div');
            notification.className = 'notification';

            let message = `طلبك رقم ${doc.id} قيد المراجعة.`;
            if (order.status === 'preparing') {
                message = `يتم تجهيز طلبك رقم ${doc.id}.`;
                if (!order.paymentReceiptUrl) {
                    notification.innerHTML += createPaymentForm(doc.id);
                }
            }
            notification.prepend(document.createTextNode(message));
            orderStatusDiv.appendChild(notification);
        });
    });
}

function createPaymentForm(orderId) { /* ... نفس الكود السابق ... */ }
async function updatePaymentMethod(orderId, method) { /* ... نفس الكود السابق ... */ }
function uploadReceipt(orderId) { /* ... نفس الكود السابق ... */ }

// =================================================
// 10. ربط الأحداث (Event Listeners)
// =================================================
// التنقل
navLinks.products.addEventListener('click', (e) => { e.preventDefault(); showPage('products'); });
navLinks.cart.addEventListener('click', (e) => { e.preventDefault(); showPage('cart'); });
navLinks.profile.addEventListener('click', (e) => { e.preventDefault(); showPage('profile'); });
navLinks.logout.addEventListener('click', () => signOut(auth));

// المصادقة
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

// إضافة للسلة
productListDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const sku = e.target.dataset.sku;
        addToCart(sku);
    }
});

// إتمام الطلب
document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) return alert('سلتك فارغة!');
    if (!currentUser) return alert('الرجاء تسجيل الدخول أولاً.');

    const order = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: cart,
        total: cart.reduce((sum, item) => sum + parseFloat(item.price), 0),
        status: 'pending',
        createdAt: serverTimestamp() // استخدام وقت الخادم لضمان الدقة
    };
    try {
        const docRef = await addDoc(collection(db, "orders"), order);
        alert(`تم إرسال طلبك بنجاح! رقم الطلب: ${docRef.id}`);
        cart = [];
        updateCart();
        showPage('profile');
    } catch (error) {
        console.error("خطأ في إرسال الطلب: ", error);
        alert("حدث خطأ أثناء إرسال الطلب.");
    }
});

// =================================================
// 11. بدء تشغيل التطبيق
// =================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCart();
    // لا تقم باستدعاء showPage هنا، onAuthStateChanged ستقوم بذلك.
});

// الدوال التي لم تتغير (للتأكيد فقط)
function createPaymentForm(orderId) {
    return `
        <div class="payment-form">
            <p>اختر طريقة الدفع:</p>
            <select id="payment-method-${orderId}">
                <option value="">اختر...</option>
                <option value="cash_on_delivery">الدفع عند الاستلام</option>
                <option value="bank_transfer">تحويل بنكي</option>
            </select>
            <div id="payment-upload-${orderId}" style="display:none; margin-top:10px;">
                <p>يرجى إرفاق صورة الوصل.</p>
                <input type="file" id="receipt-file-${orderId}">
                <button id="upload-btn-${orderId}">تأكيد الدفع</button>
            </div>
        </div>
    `;
}
// يجب ربط الأحداث لهذه العناصر بعد إنشائها
document.body.addEventListener('change', async (e) => {
    if(e.target.id.startsWith('payment-method-')) {
        const orderId = e.target.id.replace('payment-method-', '');
        const method = e.target.value;
        const uploadDiv = document.getElementById(`payment-upload-${orderId}`);
        if (method === 'bank_transfer') {
            uploadDiv.style.display = 'block';
        } else {
            uploadDiv.style.display = 'none';
        }
        if (method === 'cash_on_delivery') {
            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, { paymentMethod: method, status: 'confirmed' });
            alert('تم اختيار الدفع عند الاستلام.');
        }
    }
});
document.body.addEventListener('click', (e) => {
    if(e.target.id.startsWith('upload-btn-')) {
        const orderId = e.target.id.replace('upload-btn-', '');
        uploadReceipt(orderId);
    }
});
function uploadReceipt(orderId) {
    const fileInput = document.getElementById(`receipt-file-${orderId}`);
    const file = fileInput.files[0];
    if (!file) { return alert('الرجاء اختيار ملف الإيصال.'); }
    
    const filePath = `receipts/${orderId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => { console.log(`Upload is ${snapshot.bytesTransferred / snapshot.totalBytes * 100}% done`); },
        (error) => { console.error(error); alert('فشل رفع الصورة.'); },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                const orderRef = doc(db, "orders", orderId);
                await updateDoc(orderRef, {
                    paymentReceiptUrl: downloadURL,
                    status: 'payment_review'
                });
                alert('تم رفع الإيصال بنجاح!');
            });
        }
    );
}
