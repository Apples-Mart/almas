// =================================================
// 1. إعدادات FIREBASE
// =================================================
// #region Firebase Initialization and Offline Persistence
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, writeBatch, getDocs, where, increment, initializeFirestore, persistentLocalCache, addDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCfOzC8gkqkVSNZ3frtnnCMxbeq-v7yaTY",
  authDomain: "almas-store-a51eb.firebaseapp.com",
  databaseURL: "https://almas-store-a51eb-default-rtdb.firebaseio.com",
  projectId: "almas-store-a51eb",
  storageBucket: "almas-store-a51eb.firebasestorage.app",
  messagingSenderId: "502522968593",
  appId: "1:502522968593:web:52dc253f8ea12f4d5bcfb0",
  measurementId: "G-G0WC9BJ6JW"
};
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { cache: persistentLocalCache({}) });
const auth = getAuth(app);

window.db = db; window.doc = doc; window.collection = collection; window.writeBatch = writeBatch; window.serverTimestamp = serverTimestamp; window.getDocs = getDocs; window.query = query; window.where = where; window.increment = increment; window.addDoc = addDoc; window.setDoc = setDoc;
window.readCollection = (collectionName, callback, orderByField = "name", orderDirection = "asc") => onSnapshot(query(collection(db, collectionName), orderBy(orderByField, orderDirection)), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))));
window.updateDocument = (collectionName, docId, data) => updateDoc(doc(db, collectionName, docId), data);
window.deleteDocument = (collectionName, docId) => deleteDoc(doc(db, collectionName, docId));
window.getDocument = async (collectionName, docId) => { const d = await getDoc(doc(db, collectionName, docId)); return d.exists() ? { id: d.id, ...d.data() } : null; };
// #endregion// =================================================
// 2. الوصول لعناصر الصفحة (DOM Elements)
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

// عناصر أخرى
const productListDiv = document.getElementById('product-list');
const cartItemsDiv = document.getElementById('cart-items');
const cartCountSpan = document.getElementById('cart-count');
const cartTotalSpan = document.getElementById('cart-total');
const userEmailSpan = document.getElementById('user-email');
const orderStatusDiv = document.getElementById('order-status');
const orderHistoryUl = document.getElementById('order-history');


// =================================================
// 3. متغيرات الحالة (State Variables)
// =================================================
let productsData = [];
let cart = [];
let currentUser = null;

// =================================================
// 4. إدارة العرض والتنقل بين الصفحات
// =================================================
function showPage(pageName) {
    Object.values(pages).forEach(page => page.style.display = 'none');
    pages[pageName].style.display = 'block';
}

// روابط التنقل
navLinks.products.addEventListener('click', () => showPage('products'));
navLinks.cart.addEventListener('click', () => showPage('cart'));
navLinks.profile.addEventListener('click', () => showPage('profile'));
navLinks.logout.addEventListener('click', () => auth.signOut());


// =================================================
// 5. إدارة المصادقة (Authentication)
// =================================================
auth.onAuthStateChanged(user => {
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

// تبديل بين نماذج الدخول والتسجيل
document.getElementById('show-signup').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
});
document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
});

// التسجيل
document.getElementById('signup-btn').addEventListener('click', () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .catch(error => alert(error.message));
});

// تسجيل الدخول
document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => alert(error.message));
});

// =================================================
// 6. تحميل وعرض المنتجات
// =================================================
async function fetchProducts() {
    try {
        const response = await fetch('products.json');
        productsData = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// --- ✨ تم تعديل هذه الدالة لتناسب هيكل الـ JSON الجديد ---
function renderProducts() {
    productListDiv.innerHTML = '';
    // المرور على مصفوفة المنتجات مباشرة
    productsData.forEach(item => {
        // التحقق من أن المنتج لديه سعر واسم
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


// =================================================
// 7. إدارة سلة المشتريات
// =================================================

// --- ✨ تم تعديل هذه الدالة للبحث في الهيكل الجديد ---
function findProductById(sku) {
    // البحث في مصفوفة المنتجات مباشرة عن المنتج الذي يطابق الـ sku
    return productsData.find(item => item.sku === sku);
}

function addToCart(productSku) {
    // نستخدم الـ sku الآن للعثور على المنتج
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
            total += item.price;
        });
    }
    cartCountSpan.textContent = cart.length;
    cartTotalSpan.textContent = total;
}

// =================================================
// 8. إتمام الطلب وإرساله إلى Firebase
// =================================================
document.getElementById('checkout-btn').addEventListener('click', () => {
    if (cart.length === 0) {
        alert('سلتك فارغة!');
        return;
    }
    if (!currentUser) {
        alert('الرجاء تسجيل الدخول أولاً لإتمام الطلب.');
        showPage('auth');
        return;
    }

    const order = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price, 0),
        status: 'pending', // pending, preparing, shipped, delivered
        createdAt: new Date()
    };

    db.collection('orders').add(order)
        .then(docRef => {
            alert(`تم إرسال طلبك بنجاح! رقم الطلب: ${docRef.id}`);
            cart = [];
            updateCart();
            showPage('profile');
            loadUserProfile(); // تحديث الصفحة الشخصية لعرض الطلب الجديد
        })
        .catch(error => console.error("Error adding document: ", error));
});


// =================================================
// 9. صفحة المستخدم الشخصية
// =================================================
function loadUserProfile() {
    if (!currentUser) return;
    loadOrderHistory();
    listenForOrderUpdates();
}

// تحميل الطلبات السابقة
async function loadOrderHistory() {
    orderHistoryUl.innerHTML = '';
    const querySnapshot = await db.collection('orders')
                                   .where('userId', '==', currentUser.uid)
                                   .orderBy('createdAt', 'desc')
                                   .get();
    querySnapshot.forEach(doc => {
        const order = doc.data();
        const li = document.createElement('li');
        li.textContent = `طلب بتاريخ ${order.createdAt.toDate().toLocaleDateString()} - الإجمالي: ${order.total} جنيه - الحالة: ${translateStatus(order.status)}`;
        orderHistoryUl.appendChild(li);
    });
}

// الاستماع لتحديثات الطلبات (الإشعارات)
function listenForOrderUpdates() {
    orderStatusDiv.innerHTML = '';
    db.collection('orders')
      .where('userId', '==', currentUser.uid)
      .where('status', 'in', ['pending', 'preparing'])
      .onSnapshot(snapshot => {
          orderStatusDiv.innerHTML = ''; // مسح الإشعارات القديمة
          snapshot.forEach(doc => {
              const order = doc.data();
              const notification = document.createElement('div');
              notification.className = 'notification';

              let message = `طلبك رقم ${doc.id} قيد المراجعة.`;
              if (order.status === 'preparing') {
                  message = `يتم تجهيز طلبك رقم ${doc.id}. طريقة الدفع المتاحة: ${order.paymentMethod || 'لم تحدد بعد'}.`;
                  // هنا تضيف منطق الدفع
                  if (!order.paymentReceiptUrl) {
                      notification.innerHTML += createPaymentForm(doc.id);
                  }
              }
              notification.prepend(document.createTextNode(message));
              orderStatusDiv.appendChild(notification);
          });
      });
}

function translateStatus(status) {
    const statuses = {
        pending: 'قيد المراجعة',
        preparing: 'قيد التجهيز',
        shipped: 'تم الشحن',
        delivered: 'تم التوصيل',
        payment_review: 'قيد مراجعة الدفع'
    };
    return statuses[status] || status;
}

// إنشاء نموذج الدفع
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
                <input type="text" id="ref-num-${orderId}" placeholder="الرقم المرجعي للعملية">
                <button onclick="uploadReceipt('${orderId}')">تأكيد الدفع</button>
            </div>
        </div>
    `;
}

// تحديث طريقة الدفع في Firebase
function updatePaymentMethod(orderId, method) {
    const uploadDiv = document.getElementById(`payment-upload-${orderId}`);
    if (method === 'bank_transfer') {
        uploadDiv.style.display = 'block';
    } else {
        uploadDiv.style.display = 'none';
    }
     if (method === 'cash_on_delivery') {
        db.collection('orders').doc(orderId).update({ paymentMethod: method, status: 'confirmed' })
        .then(() => alert('تم اختيار الدفع عند الاستلام. سيتم تأكيد طلبك قريباً.'));
    }
}

// رفع إيصال الدفع
function uploadReceipt(orderId) {
    const file = document.getElementById(`receipt-file-${orderId}`).files[0];
    const refNumber = document.getElementById(`ref-num-${orderId}`).value;
    if (!file || !refNumber) {
        alert('الرجاء إرفاق صورة الوصل وإدخال الرقم المرجعي.');
        return;
    }

    const filePath = `receipts/${orderId}/${file.name}`;
    const fileRef = storage.ref(filePath);
    const uploadTask = fileRef.put(file);

    uploadTask.on('state_changed', 
        (snapshot) => { /* يمكنك هنا عرض نسبة التقدم للرفع */ }, 
        (error) => { console.error(error); alert('فشل رفع الصورة.'); }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                db.collection('orders').doc(orderId).update({
                    paymentReceiptUrl: downloadURL,
                    paymentRefNumber: refNumber,
                    status: 'payment_review' // حالة جديدة ليراجعها المدير
                }).then(() => {
                    alert('تم رفع الإيصال بنجاح! سيتم مراجعة الدفع.');
                });
            });
        }
    );
}

// =================================================
// 10. بدء تشغيل التطبيق
// =================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCart();
    showPage('auth'); // يبدأ من صفحة الدخول
});

