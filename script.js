const API_URL = "https://nocob-proxy.kurikulum-sman2cikarangbarat.workers.dev";
let exam = { 
    questions: [], 
    currentIndex: 0, 
    answers: {}, 
    student: {}, 
    config: {}, 
    timeLeft: 0, 
    start: null, 
    optionStates: {}, 
    cheatCount: 0,
    isFullscreen: false,
    fullscreenRequested: false
};

// ==================== FUNGSI FULLSCREEN ====================
function requestFullscreen() {
    const elem = document.documentElement;
    
    if (!exam.fullscreenRequested) {
        showFullscreenModal();
        exam.fullscreenRequested = true;
        return;
    }
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => {
            exam.isFullscreen = true;
            hideFullscreenModal();
            showToast("✅ Mode fullscreen aktif");
            checkFullscreenPeriodically();
        }).catch(err => {
            console.error('Fullscreen error:', err);
            showToast("❌ Gagal masuk fullscreen. Tekan F11 manual");
            // Tetap lanjut meski fullscreen gagal
            setTimeout(() => {
                hideFullscreenModal();
                showWelcome();
            }, 2000);
        });
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen().then(() => {
            exam.isFullscreen = true;
            hideFullscreenModal();
            showToast("✅ Mode fullscreen aktif");
            checkFullscreenPeriodically();
        });
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen().then(() => {
            exam.isFullscreen = true;
            hideFullscreenModal();
            showToast("✅ Mode fullscreen aktif");
            checkFullscreenPeriodically();
        });
    } else {
        showToast("❌ Browser tidak support fullscreen. Tekan F11 manual");
        setTimeout(() => {
            hideFullscreenModal();
            showWelcome();
        }, 2000);
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
            exam.isFullscreen = false;
        });
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
        exam.isFullscreen = false;
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
        exam.isFullscreen = false;
    }
}

function exitFullscreenAndReload() {
    exitFullscreen();
    setTimeout(() => location.reload(), 500);
}

function checkFullscreenPeriodically() {
    setInterval(() => {
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.msFullscreenElement);
        
        if (!isFullscreen && document.getElementById('view-exam').classList.contains('active')) {
            exam.cheatCount++;
            showToast(`⚠️ PERINGATAN ${exam.cheatCount}: Kembali ke fullscreen!`);
            
            if (exam.cheatCount >= 2) {
                showFullscreenModal();
            }
            
            if (exam.cheatCount >= 3) {
                showToast("❌ Keluar fullscreen berkali-kali! Ujian diakhiri.");
                setTimeout(() => submitData(), 2000);
            }
        }
    }, 1000);
}

function showFullscreenModal() {
    document.getElementById('modal-fullscreen').style.display = 'flex';
}

function hideFullscreenModal() {
    document.getElementById('modal-fullscreen').style.display = 'none';
}

// Event listener untuk tombol fullscreen
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-fullscreen').addEventListener('click', requestFullscreen);
    
    // Deteksi jika user tekan F11 manual
    document.addEventListener('keydown', function(e) {
        if (e.keyCode === 122) { // F11
            exam.isFullscreen = true;
            hideFullscreenModal();
            setTimeout(() => showWelcome(), 500);
        }
    });
    
    // Deteksi perubahan fullscreen state
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
});

function handleFullscreenChange() {
    const isFullscreenNow = !!(document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.msFullscreenElement);
    
    exam.isFullscreen = isFullscreenNow;
    
    if (!isFullscreenNow && document.getElementById('view-exam').classList.contains('active')) {
        exam.cheatCount++;
        showToast(`⚠️ PERINGATAN ${exam.cheatCount}: Kembali ke fullscreen!`);
        
        if (exam.cheatCount >= 3) {
            showToast("❌ Keluar fullscreen berkali-kali! Ujian diakhiri.");
            setTimeout(() => submitData(), 2000);
        }
    }
}

// ==================== FUNGSI KEAMANAN ====================
function enableSecurityFeatures() {
    // Blokir klik kanan
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showToast("⛔ Klik kanan dinonaktifkan");
        return false;
    });
    
    // Blokir shortcut keyboard
    document.addEventListener('keydown', function(e) {
        // Izinkan F11 untuk fullscreen manual
        if (e.keyCode === 122) return true;
        
        // Blokir F12 (Inspect)
        if (e.keyCode === 123) {
            e.preventDefault();
            showToast("⛔ Inspect dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+Shift+I (Inspect)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            showToast("⛔ Inspect dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            showToast("⛔ Console dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+Shift+C (Inspect Element)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            showToast("⛔ Inspect dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            showToast("⛔ View source dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+C (Copy)
        if (e.ctrlKey && e.keyCode === 67 && !e.shiftKey) {
            e.preventDefault();
            showToast("⛔ Copy teks dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+V (Paste)
        if (e.ctrlKey && e.keyCode === 86) {
            e.preventDefault();
            showToast("⛔ Paste teks dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+X (Cut)
        if (e.ctrlKey && e.keyCode === 88) {
            e.preventDefault();
            showToast("⛔ Cut teks dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+A (Select All)
        if (e.ctrlKey && e.keyCode === 65) {
            e.preventDefault();
            showToast("⛔ Select all dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            showToast("⛔ Save page dinonaktifkan");
            return false;
        }
        
        // Blokir Ctrl+P (Print)
        if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            showToast("⛔ Print dinonaktifkan");
            return false;
        }
    });
    
    // Blokir drag and drop
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Blokir seleksi teks
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Deteksi Developer Tools
    let devtools = function() {};
    devtools.toString = function() {
        showToast("⚠️ Aktivitas mencurigakan terdeteksi!");
        exam.cheatCount++;
    };
    
    console.log('%c', devtools);
    console.clear();
}

// ==================== FUNGSI UTAMA ====================
function showToast(m) { 
    const t = document.getElementById('toast'); 
    t.innerText = m; 
    t.style.opacity = 1;
    setTimeout(() => t.style.opacity = 0, 2000);
}

function filterKelompok() {
    const tingkat = document.getElementById('input-kelas').value;
    const select = document.getElementById('input-kelompok');
    select.innerHTML = '<option value="" disabled selected>-- Pilih Kelas --</option>';
    
    ["A","B","C","D","E","F","G","H","I","J","K","L"].forEach(huruf => {
        let option = document.createElement("option");
        option.value = `${tingkat} - ${huruf}`;
        option.text = `${tingkat} - ${huruf}`;
        select.appendChild(option);
    });
}

function showConfirm() { 
    document.getElementById('modal-confirm').style.display = 'flex'; 
}

function hideConfirm() { 
    document.getElementById('modal-confirm').style.display = 'none'; 
}

function showWelcome() {
    const welcomeText = `
        <h3 style="color: #1a73e8; margin-bottom: 15px;">Halo, ${exam.student.nama}!</h3>
        <p style="margin-bottom: 15px;">
            Anda akan mengerjakan ujian <strong>${exam.config.mapel}</strong><br>
            untuk kelas <strong>${exam.student.rombel}</strong>
        </p>
        <div style="background: #e8f0fe; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <p style="margin-bottom: 10px;">📝 <strong>Petunjuk:</strong></p>
            <ul style="text-align: left; margin-left: 20px;">
                <li>Kerjakan soal dengan sungguh-sungguh dan jujur</li>
                <li>Waktu ujian: <strong>${exam.config.durasi} menit</strong></li>
                <li>Total soal: <strong>${exam.questions.length} butir</strong></li>
                <li>Pilih jawaban dengan mengklik opsi yang tersedia</li>
                <li>Klik KIRIM setelah semua soal terjawab</li>
                <li><strong>Mode fullscreen aktif</strong> - jangan keluar dari mode ini</li>
            </ul>
        </div>
        <p style="font-style: italic; color: #666;">
            "Kejujuran adalah fondasi karakter yang kuat.<br>
            Hasil terbaik datang dari usaha yang tulus."
        </p>
        <p style="margin-top: 20px; font-weight: bold; color: #27ae60;">
            Selamat mengerjakan! 🎯
        </p>
    `;
    
    document.getElementById('welcome-text').innerHTML = welcomeText;
    document.getElementById('view-loading').classList.remove('active');
    document.getElementById('view-welcome').classList.add('active');
}

function startExam() {
    document.getElementById('view-welcome').classList.remove('active');
    document.getElementById('view-exam').classList.add('active');
    renderQuestion();
    startTimer();
}

async function login() {
    const nama = document.getElementById('input-nama').value;
    const kelas = document.getElementById('input-kelas').value;
    const kelompok = document.getElementById('input-kelompok').value;
    const token = document.getElementById('input-token').value.trim();
    
    if(!nama || !kelas || !kelompok || !token) {
        showToast("Lengkapi semua kolom!");
        return;
    }

    // Aktifkan fitur keamanan setelah login
    enableSecurityFeatures();
    
    document.getElementById('view-login').style.display = 'none';
    document.getElementById('view-loading').classList.add('active');
    document.getElementById('loading-text').innerText = "Memeriksa token...";

    try {
        const [resUjian, resSoal] = await Promise.all([
            fetch(`${API_URL}/api/ujian?where=(token,eq,${token})`),
            fetch(`${API_URL}/api/bank_soal?where=(token,eq,${token})`)
        ]);
        
        const [dataUjian, dataSoal] = await Promise.all([
            resUjian.json(),
            resSoal.json()
        ]);

        if(!dataUjian.list.length) {
            throw new Error("Token Salah!");
        }
        
        exam.questions = dataSoal.list.sort(() => Math.random() - 0.5);
        exam.student = { 
            nama: nama, 
            tingkat: kelas, 
            rombel: kelompok, 
            token: token 
        };
        exam.config = { 
            mapel: dataUjian.list[0].mapel, 
            guru: dataUjian.list[0].nama_guru, 
            durasi: dataUjian.list[0].durasi 
        };
        exam.timeLeft = (parseInt(dataUjian.list[0].durasi) || 90) * 60;
        exam.start = new Date();

        // Tampilkan modal fullscreen
        showFullscreenModal();
        
    } catch(error) { 
        showToast(error.message); 
        setTimeout(() => location.reload(), 2000);
    }
}

function renderQuestion() {
    const q = exam.questions[exam.currentIndex];
    const qId = q.Id || q.id;
    
    document.getElementById('q-number').innerText = `${exam.currentIndex + 1} / ${exam.questions.length}`;
    document.getElementById('q-text').innerHTML = q.soal;

    const img = document.getElementById('q-img');
    if(q.img_link) { 
        const id = q.img_link.match(/[-\w]{25,}/);
        img.src = id ? `https://lh3.googleusercontent.com/u/0/d/${id[0]}` : q.img_link;
        img.style.display = 'block';
    } else { 
        img.style.display = 'none'; 
    }

    if (!exam.optionStates[qId]) {
        let options = [
            {label:'A', text:q.opsi_a},
            {label:'B', text:q.opsi_b},
            {label:'C', text:q.opsi_c},
            {label:'D', text:q.opsi_d},
            {label:'E', text:q.opsi_e}
        ].filter(o => o.text);
        
        exam.optionStates[qId] = options.sort(() => Math.random() - 0.5);
    }

    let html = '';
    exam.optionStates[qId].forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const selected = exam.answers[qId] === option.label ? 'selected' : '';
        html += `<div class="option ${selected}" onclick="setAns('${qId}','${option.label}')">
                    <b>${letter}.</b> ${option.text}
                 </div>`;
    });
    
    document.getElementById('q-options').innerHTML = html;

    const semuaTerjawab = Object.keys(exam.answers).length === exam.questions.length;
    document.getElementById('btn-kirim-trigger').style.display = semuaTerjawab ? 'block' : 'none';
    
    renderNav();
}

function setAns(id, label) { 
    exam.answers[id] = label; 
    renderQuestion(); 
    setTimeout(() => { 
        if(exam.currentIndex < exam.questions.length - 1) {
            jump(exam.currentIndex + 1); 
        }
    }, 400);
}

function startTimer() {
    exam.timer = setInterval(() => {
        exam.timeLeft--;
        let minutes = Math.floor(exam.timeLeft/60).toString().padStart(2,'0');
        let seconds = (exam.timeLeft%60).toString().padStart(2,'0');
        document.getElementById('timer-display').innerText = `${minutes}:${seconds}`;
        
        // Warning ketika waktu hampir habis
        if(exam.timeLeft === 300) { // 5 menit
            showToast("⏰ Waktu tersisa 5 menit!");
        }
        
        if(exam.timeLeft <= 0) {
            showToast("⏰ Waktu habis! Jawaban otomatis dikirim");
            submitData();
        }
    }, 1000);
}

function jump(index) { 
    exam.currentIndex = index; 
    renderQuestion(); 
}

function nextQ() { 
    if(exam.currentIndex < exam.questions.length - 1) {
        jump(exam.currentIndex + 1); 
    }
}

function prevQ() { 
    if(exam.currentIndex > 0) {
        jump(exam.currentIndex - 1); 
    }
}

function renderNav() {
    document.getElementById('nav-grid').innerHTML = exam.questions.map((q, index) => {
        const qId = q.Id || q.id;
        const answered = exam.answers[qId] ? 'answered' : '';
        const current = index === exam.currentIndex ? 'current' : '';
        
        return `<div class="nav-box ${answered} ${current}" onclick="jump(${index})">${index + 1}</div>`;
    }).join('');
}

async function submitData() {
    hideConfirm();
    clearInterval(exam.timer);
    
    // Exit fullscreen sebelum submit
    if (exam.isFullscreen) {
        exitFullscreen();
    }
    
    document.getElementById('view-exam').style.display = 'none';
    document.getElementById('view-loading').classList.add('active');
    document.getElementById('loading-text').innerText = "Menyimpan jawaban ke server...";

    let sortedQuestions = [...exam.questions].sort((a, b) => (a.Id||a.id) - (b.Id||b.id));
    let stringJawaban = "";
    let benar = 0;
    
    sortedQuestions.forEach(q => {
        const jawaban = exam.answers[q.Id||q.id] || "-";
        stringJawaban += jawaban;
        if(jawaban === q.kunci) benar++;
    });

    const now = new Date();
    const payload = {
        nama_siswa: exam.student.nama,
        token: exam.student.token,
        mapel: exam.config.mapel,
        kelas: exam.student.tingkat,
        id_kelas: exam.student.rombel,
        jml_benar: benar,
        jml_salah: exam.questions.length - benar,
        nilai: Math.round((benar/exam.questions.length)*100),
        nama_guru: exam.config.guru,
        jawaban: stringJawaban,
        curang: exam.cheatCount,
        wkt_diberikan: exam.config.durasi + " Menit",
        wkt_mulai: exam.start.toISOString().slice(0,19).replace('T',' '),
        wkt_selesai: now.toISOString().slice(0,19).replace('T',' '),
        wkt_digunakan: Math.floor((now - exam.start)/60000) + " Menit"
    };

    try {
        document.getElementById('loading-text').innerText = "Mengirim data...";
        
        await fetch(`${API_URL}/api/nilai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        document.getElementById('view-loading').classList.remove('active');
        document.getElementById('view-result').classList.add('active');
        document.getElementById('final-msg').innerHTML = 
            `Jawaban <b>${exam.student.nama}</b> berhasil dikirim.<br>
             <span style="color: #27ae60; font-weight: bold;">Nilai: ${payload.nilai}</span><br><br>
             <small>Silakan tunjukkan layar ini kepada pengawas.</small>`;
    } catch(error) { 
        showToast("Gagal kirim, mencoba ulang..."); 
        setTimeout(submitData, 3000); 
    }
}

// Deteksi berpindah tab
document.addEventListener("visibilitychange", () => {
    if (document.hidden && document.getElementById('view-exam').classList.contains('active')) {
        exam.cheatCount++;
        showToast("⚠️ PERINGATAN: Jangan pindah tab atau window!");
        showToast(`Peringatan ${exam.cheatCount}: Aktivitas dicurigai`);
        
        if(exam.cheatCount >= 3) {
            showToast("❌ Terdeteksi kecurangan! Ujian diakhiri.");
            setTimeout(() => submitData(), 2000);
        }
    }
});

// Deteksi resize window (indikasi inspect)
window.addEventListener('resize', function() {
    if (document.getElementById('view-exam').classList.contains('active')) {
        if(window.outerHeight - window.innerHeight > 100 || window.outerWidth - window.innerWidth > 100) {
            exam.cheatCount++;
            showToast("⚠️ Aktivitas mencurigakan terdeteksi!");
        }
    }
});

// Mencegah akses ke console
(function() {
    const noop = function() {};
    const methods = ['log', 'debug', 'warn', 'info', 'error', 'assert', 'clear', 'count', 'dir', 'dirxml', 'table', 'trace', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeStamp', 'profile', 'profileEnd'];
    
    methods.forEach(function(method) {
        console[method] = noop;
    });
})();
