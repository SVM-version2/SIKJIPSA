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
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    orderBy,
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

// ▼▼▼ [핵심] 필요한 모든 객체와 함수를 export 합니다. ▼▼▼
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://sik-jip-sa.firebasestorage.app");

export {
    // Auth
    onAuthStateChanged,
    // Firestore
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    orderBy,
    serverTimestamp,
    // Storage
    ref,
    uploadBytes,
    getDownloadURL
};




// ▼▼▼ [핵심 수정] 모든 DOM 조작 코드를 DOMContentLoaded 안에 넣습니다. ▼▼▼
document.addEventListener('DOMContentLoaded', () => {

    // -------------------------------------------------------------------
    // DOM 요소 선택
    // -------------------------------------------------------------------
    const header = document.getElementById('main-header');
    const modalWrapper = document.getElementById('modal-wrapper');
    const loginNavButton = document.querySelector('header nav .cta-button');

    // 스크롤에 반응하는 헤더 스타일 변경
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // 로그인/회원가입 모달 관련 로직 (모달이 있는 페이지에서만 실행)
    if (modalWrapper) {
        const closeButton = document.querySelector('.close-button');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const loginFormElement = loginForm.querySelector('form');
        const signupFormElement = signupForm.querySelector('form');
        const showSignupLink = document.getElementById('show-signup');
        const showLoginLink = document.getElementById('show-login');
        const modalRight = document.querySelector('.modal-right');
        
        const style = document.createElement('style');
        style.innerHTML = `.modal-right { transition: opacity 0.3s ease-in-out; }`;
        document.head.appendChild(style);

        const openLoginModal = (event) => {
            event.preventDefault();
            modalWrapper.classList.add('open');
        };

        const closeModal = () => modalWrapper.classList.remove('open');

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
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    createdAt: serverTimestamp()
                });
                alert('🎉 회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
                switchForms(signupForm, loginForm);
            } catch (error) {
                console.error("❌ 회원가입 에러:", error);
                if (error.code === 'auth/email-already-in-use') alert('이미 사용 중인 이메일입니다.');
                else if (error.code === 'auth/weak-password') alert('비밀번호는 6자 이상이어야 합니다.');
                else alert(`회원가입 중 오류가 발생했습니다: ${error.message}`);
            }
        });

        loginFormElement.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                alert('이메일과 비밀번호를 입력해주세요.');
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
                closeModal();
            } catch (error) {
                console.error("❌ 로그인 에러:", error);
                alert('이메일 또는 비밀번호가 올바르지 않습니다.');
            }
        });
    }

    // 인증 상태 변경 리스너 (모든 페이지 공통)
    if (loginNavButton) {
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
            if (modalWrapper) { // modalWrapper가 있을 때만 openLoginModal 리스너를 제거/추가
                 loginNavButton.removeEventListener('click', modalWrapper.openLoginModal);
            }
            
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userName = userDoc.data().name;
                    loginNavButton.textContent = `${userName} 집사님`;
                    loginNavButton.addEventListener('click', handleLogout);
                    isLogoutListenerAttached = true;
                } else {
                    loginNavButton.textContent = '정보 없음';
                }
            } else {
                loginNavButton.textContent = 'Login';
                if (modalWrapper) { // modalWrapper가 있을 때만 openLoginModal 리스너를 추가
                     loginNavButton.addEventListener('click', modalWrapper.openLoginModal);
                }
            }
        });
    }


    // ========== 푸터 모듈화 ==========
    loadFooter();

});


// ==========푸터 모듈화===============
// 이 함수들은 DOMContentLoaded 리스너 안에서 호출될 것이므로 여기에 둡니다.
function loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    fetch('footer.html')
        .then(response => {
            if (!response.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
            return response.text();
        })
        .then(data => {
            placeholder.innerHTML = data;
            initializeModalScripts(); 
        })
        .catch(error => {
            console.error('푸터를 불러오는 중 오류 발생:', error);
            placeholder.innerHTML = '<p style="text-align:center; color:red;">푸터를 불러오지 못했습니다.</p>';
        });
}

function initializeModalScripts() {
    const modalWrapper = document.getElementById('info-modal-wrapper');
    if (!modalWrapper) return;

    const openFaqBtn = document.getElementById('open-faq-modal');
    const openIdeaBtn = document.getElementById('open-idea-modal');
    const copyBtn = document.getElementById('copy-email-btn');

    const closeModal = () => modalWrapper.classList.remove('visible');

    const openModal = (modalId) => {
        document.querySelectorAll('.info-modal-content').forEach(content => content.style.display = 'none');
        const targetModal = document.getElementById(modalId);
        if (targetModal) {
            targetModal.style.display = 'block';
            modalWrapper.classList.add('visible');
        }
    };

    if(openFaqBtn) openFaqBtn.addEventListener('click', (e) => { e.preventDefault(); openModal('faq-modal'); });
    if(openIdeaBtn) openIdeaBtn.addEventListener('click', (e) => { e.preventDefault(); openModal('idea-modal'); });
    
    modalWrapper.addEventListener('click', (e) => {
        if (e.target === modalWrapper) closeModal();
    });

    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeModal));

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const emailAddress = document.getElementById('idea-email-address').textContent;
            navigator.clipboard.writeText(emailAddress).then(() => {
                copyBtn.textContent = '✅ 복사 완료!';
                copyBtn.disabled = true;
                setTimeout(() => {
                    copyBtn.textContent = '이메일 주소 복사';
                    copyBtn.disabled = false;
                }, 2000);
            });
        });
    }
}