// navigation.js
// -------------------------------------------------------------------
// Firebase SDK import 및 초기화
// -------------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut,
    sendEmailVerification // [추가] 이메일 인증 함수 import
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC7mA9xLOFb98i5hKNWjKW_fORWNHvPx2s",
    authDomain: "sik-jip-sa.firebaseapp.com",
    projectId: "sik-jip-sa",
    storageBucket: "sik-jip-sa.appspot.com",
    messagingSenderId: "401707534850",
    appId: "1:401707534850:web:e15b2f67e2d4484a07351b",
    measurementId: "G-HX50P6C0NT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://sik-jip-sa.firebasestorage.app");
export { ref, uploadBytes, getDownloadURL };

// -------------------------------------------------------------------
// DOM 요소 선택 및 이벤트 리스너 (기존과 동일)
// -------------------------------------------------------------------
const header = document.getElementById('main-header');
const modalWrapper = document.getElementById('modal-wrapper');
const loginNavButton = document.querySelector('header nav .cta-button');
const closeButton = document.querySelector('#modal-wrapper .close-button');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginFormElement = loginForm.querySelector('form');
const signupFormElement = signupForm.querySelector('form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const modalRight = document.querySelector('.modal-right');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

const openLoginModal = (event) => {
    event.preventDefault();
    modalWrapper.classList.add('open');
};

const closeModal = () => {
    modalWrapper.classList.remove('open');
};

const switchForms = (hideForm, showForm) => {
    modalRight.style.opacity = '0';
    setTimeout(() => {
        hideForm.style.display = 'none';
        showForm.style.display = 'block';
        modalRight.style.opacity = '1';
    }, 300);
};

closeButton.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target === modalWrapper) closeModal();
});
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalWrapper.classList.contains('open')) closeModal();
});
showSignupLink.addEventListener('click', (event) => {
    event.preventDefault();
    switchForms(loginForm, signupForm);
});
showLoginLink.addEventListener('click', (event) => {
    event.preventDefault();
    switchForms(signupForm, loginForm);
});

const style = document.createElement('style');
style.innerHTML = `.modal-right { transition: opacity 0.3s ease-in-out; }`;
document.head.appendChild(style);

// -------------------------------------------------------------------
// Firebase Form 제출 로직 (로그인/회원가입)
// -------------------------------------------------------------------

// 1. 회원가입 폼 제출 [수정]
signupFormElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // [추가] 인증 이메일 발송
        await sendEmailVerification(auth.currentUser);

        // Firestore에 사용자 정보 저장
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            createdAt: serverTimestamp()
        });

        // [추가] 인증 메일 발송 후 바로 로그아웃 처리
        await signOut(auth);
        
        // [수정] 사용자에게 안내 후 모달 닫기
        alert('가입 신청이 완료되었습니다.\n입력하신 이메일로 인증 링크를 보냈으니, 확인 후 로그인해주세요.\n(받은편지함 또는 스팸함을 확인하세요)');
        closeModal();

    } catch (error) {
        console.error("❌ 회원가입 에러:", error);
        if (error.code === 'auth/email-already-in-use') alert('이미 사용 중인 이메일입니다.');
        else if (error.code === 'auth/weak-password') alert('비밀번호는 6자 이상이어야 합니다.');
        else alert(`회원가입 중 오류가 발생했습니다: ${error.message}`);
    }
});

// 2. 로그인 폼 제출 [수정]
loginFormElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // [추가] 이메일 인증 여부 확인
        if (user.emailVerified) {
            // 인증 완료 사용자: 로그인 성공 처리
            closeModal();
        } else {
            // 인증 미완료 사용자: 로그인 차단 및 안내
            await signOut(auth); // 다시 로그아웃 처리
            alert('이메일 인증이 완료되지 않았습니다.\n발송된 인증 메일을 확인해주세요.');
        }
    } catch (error) {
        console.error("❌ 로그인 에러:", error);
        // 로그인 실패 시 일관된 메시지 제공
        alert('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
});


// -------------------------------------------------------------------
// Firebase 인증 상태 변경 리스너 (기존과 동일)
// -------------------------------------------------------------------

let isLogoutListenerAttached = false;

const handleLogout = async () => {
    try {
        await signOut(auth);
        alert('로그아웃 되었습니다.');
    } catch (error) {
        console.error('로그아웃 에러', error);
        alert('로그아웃 중 문제가 발생했습니다.');
    }
};

onAuthStateChanged(auth, async (user) => {
    if (isLogoutListenerAttached) {
        loginNavButton.removeEventListener('click', handleLogout);
        isLogoutListenerAttached = false;
    }
    
    loginNavButton.removeEventListener('click', openLoginModal);

    if (user && user.emailVerified) { // [수정] user.emailVerified 조건 추가
        // --- 👤 사용자가 로그인한 경우 (그리고 이메일 인증이 완료된 경우) ---
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userName = userDoc.data().name;
            loginNavButton.textContent = `${userName} 집사님`;
            // loginNavButton.addEventListener('click', handleLogout);
            // isLogoutListenerAttached = true;
        } else {
            loginNavButton.textContent = '정보 없음';
        }
    } else {
        // --- 🚪 사용자가 로그아웃했거나 이메일 인증이 안 된 경우 ---
        loginNavButton.textContent = 'Login';
        loginNavButton.addEventListener('click', openLoginModal);
    }
});