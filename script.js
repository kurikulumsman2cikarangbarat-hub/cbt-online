async function submitData() {
    hideConfirm();
    clearInterval(exam.timer);
    document.getElementById('view-exam').style.display = 'none';
    document.getElementById('view-loading').classList.add('active');
    document.getElementById('loading-text').innerText = "Menyimpan ke Server...";

    let sorted = [...exam.questions].sort((a,b) => (a.Id||a.id) - (b.Id||b.id));
    let strAns = "", benar = 0;
    sorted.forEach(q => {
        const a = exam.answers[q.Id||q.id] || "-";
        strAns += a; if(a === q.kunci) benar++;
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
        jawaban: strAns,
        curang: exam.cheatCount,
        jml_curang: exam.tabSwitchCount, // <-- KOLOM BARU
        wkt_diberikan: exam.config.durasi + " Menit",
        wkt_mulai: exam.start.toISOString().slice(0,19).replace('T',' '),
        wkt_selesai: now.toISOString().slice(0,19).replace('T',' '),
        wkt_digunakan: Math.floor((now - exam.start)/60000) + " Menit"
    };

    try {
        await fetch(`${API_URL}/api/nilai`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        // Exit fullscreen saat selesai
        exitFullscreen();
        
        document.getElementById('view-loading').classList.remove('active');
        document.getElementById('view-result').classList.add('active');
        
        // UPDATE PESAN FINAL DENGAN LAPORAN PELANGGARAN
        let pelanggaranMessage = "";
        if (exam.tabSwitchCount === 0) {
            pelanggaranMessage = "<p style='color:#27ae60; margin:10px 0;'>✅ Tidak tercatat meninggalkan halaman ujian.</p>";
        } else {
            pelanggaranMessage = `
                <div style="background:#fff3cd; padding:12px; border-radius:8px; margin:15px 0; border-left:4px solid #ff9800;">
                    <p style="margin:0; color:#856404; font-weight:bold;">📋 LAPORAN PELANGGARAN:</p>
                    <p style="margin:5px 0 0 0; color:#856404;">
                        Anda meninggalkan halaman ujian sebanyak: <strong>${exam.tabSwitchCount} kali</strong>
                        <br>Data ini telah dicatat dan akan dilaporkan ke pengawas ruang.
                    </p>
                </div>
            `;
        }
        
        document.getElementById('final-msg').innerHTML = `
            Jawaban <b>${exam.student.nama}</b> berhasil terkirim.<br>
            ${pelanggaranMessage}
            Silakan tunjukkan layar ini kepada pengawas.
        `;
    } catch(e) { showToast("Gagal kirim, mencoba ulang..."); setTimeout(submitData, 3000); }
}
