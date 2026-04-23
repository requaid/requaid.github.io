export function renderHeader(activePage) {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'site-title';
  const logo = document.createElement('span');
  logo.className = 'logo';
  logo.textContent = '🧊';
  title.appendChild(logo);
  const titleText = document.createElement('span');
  titleText.textContent = '3D Model Board';
  title.appendChild(titleText);
  header.appendChild(title);

  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  const links = [
    { id: 'list', text: '목록', href: 'index.html' },
    { id: 'submit', text: '글쓰기', href: 'submit.html' },
    { id: 'settings', text: '설정', href: 'settings.html' },
  ];
  for (const l of links) {
    const a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.text;
    if (l.id === activePage) a.className = 'active';
    nav.appendChild(a);
  }
  header.appendChild(nav);

  return header;
}

export function mountHeader(activePage) {
  const existing = document.querySelector('.site-header');
  if (existing) existing.remove();
  document.body.insertBefore(renderHeader(activePage), document.body.firstChild);
}
