document.addEventListener('DOMContentLoaded', () => {
    const checkButton = document.getElementById('check-toxicity-btn');
    const plantInput = document.getElementById('plant-name-input');
    const resultBox = document.getElementById('toxicity-result');

    // 검사 버튼 클릭 이벤트
    const handleCheck = async () => {
        const plantName = plantInput.value.trim();

        if (!plantName) {
            alert('식물 이름을 입력해 주세요.');
            return;
        }

        // 로딩 상태 UI로 변경
        resultBox.innerHTML = `<p>AI가 "${plantName}"의 안전성을 분석 중입니다...</p>`;
        resultBox.className = 'result-box loading';
        checkButton.disabled = true;
        checkButton.textContent = '분석 중...';

        try {
            // 우리 서버의 API 엔드포인트(/api/toxicity)로 요청 전송
            const response = await fetch('/api/toxicity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plantName: plantName }),
            });

            if (!response.ok) {
                // 서버에서 보낸 에러 메시지 파싱 시도
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || `서버 응답 오류: ${response.status}`);
            }

            const data = await response.json();
            displayResult(data.toxicityInfo);

        } catch (error) {
            console.error("API 요청 중 오류 발생:", error);
            resultBox.innerHTML = `<p>오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>`;
            resultBox.className = 'result-box toxic';
        } finally {
            // 버튼 상태 원상 복구
            checkButton.disabled = false;
            checkButton.textContent = '안전성 검사하기';
        }
    };

    checkButton.addEventListener('click', handleCheck);

    // Enter 키로도 검사 실행
    plantInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCheck();
        }
    });
});

/**
 * API 응답 결과를 분석하여 화면에 표시하는 함수
 * @param {string} text - API로부터 받은 응답 텍스트
 */
function displayResult(text) {
    const resultBox = document.getElementById('toxicity-result');
    if (!text) {
        resultBox.innerHTML = `<p>결과를 받아오지 못했습니다.</p>`;
        resultBox.className = 'result-box';
        return;
    }

    resultBox.innerHTML = `<p>${text}</p>`;

    if (text.startsWith('독성 있음:')) {
        resultBox.className = 'result-box toxic';
    } else if (text.startsWith('안전함:')) {
        resultBox.className = 'result-box safe';
    } else {
        resultBox.className = 'result-box'; // '정보 없음' 등 기타 경우
    }
}
