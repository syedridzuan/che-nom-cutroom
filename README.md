# Che Nom Cutroom

[Open Cutroom](https://syedridzuan.github.io/che-nom-cutroom/)

A small Malay-language video review tool built with HTML, CSS and JavaScript. Open a clip, scrub the timeline, and export editing instructions for Claude Code or Codex. Video playback, thumbnails and edit notes stay in the browser.

## Guna

1. Tekan **Buka video** dan pilih video asal. Fail MP4 dengan video H.264 sesuai untuk kebanyakan pelayar.
2. Geser garis masa. Tekan **M** untuk tambah arahan pada satu masa. Untuk julat, tekan **I** pada permulaan dan **O** pada akhir. Masa juga boleh ditaip dalam borang.
3. Pilih jenis edit dan tulis arahan. Klik masa pada senarai untuk semak bahagian itu atau ikon pensel untuk ubah arahan.
4. Tekan **Eksport JSON**. Letakkan JSON dan video asal dalam folder yang boleh dibaca oleh Claude Code atau Codex.

Contoh permintaan kepada AI:

> Baca fail .edits.json dan gunakan video asal yang dinamakan dalam source.filename. Semua masa merujuk pada video asal. Ikut arahan dan render ke fail MP4 baharu.

Each export includes a schema version, source filename, dimensions, duration and an ordered array of edits. Times are seconds from the beginning of the original clip, with millisecond precision. A null end marks a point instruction. For ranges, interpret the interval as start inclusive, end exclusive. Read the instruction alongside its category. Rendering takes place in your editing workflow.

The browser saves notes for each local file using its name, size and last-modified time. Reopen the same file in the same browser to resume. Export JSON to keep a portable copy. The included 15-second silent demo animates an AI-generated food still and has its own editable sample notes.

## Run locally

Open `index.html` directly, or serve this folder with:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. No build, package installation, API key or backend is required.

## License

MIT. See [LICENSE](LICENSE).
