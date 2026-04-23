export function attachDropzone(container, dropzoneEl, { onFile, accept = [] }) {
  let counter = 0;
  const show = () => { dropzoneEl.classList.add('active'); };
  const hide = () => { dropzoneEl.classList.remove('active'); };

  function onEnter(e) {
    e.preventDefault();
    counter++;
    show();
  }
  function onOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }
  function onLeave(e) {
    e.preventDefault();
    counter--;
    if (counter <= 0) { counter = 0; hide(); }
  }
  async function onDrop(e) {
    e.preventDefault();
    counter = 0;
    hide();
    const files = e.dataTransfer?.files;
    if (!files || !files.length) return;
    const file = files[0];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (accept.length && !accept.includes(ext)) {
      if (onFile) onFile(null, { reason: 'extension', ext });
      return;
    }
    if (onFile) onFile(file, { ext });
  }

  container.addEventListener('dragenter', onEnter);
  container.addEventListener('dragover', onOver);
  container.addEventListener('dragleave', onLeave);
  container.addEventListener('drop', onDrop);

  return () => {
    container.removeEventListener('dragenter', onEnter);
    container.removeEventListener('dragover', onOver);
    container.removeEventListener('dragleave', onLeave);
    container.removeEventListener('drop', onDrop);
  };
}
