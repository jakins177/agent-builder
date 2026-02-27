(function() {
  // Config
  const SCRIPT_TAG = document.currentScript;
  const AGENT_ID = SCRIPT_TAG.getAttribute('data-agent-id');
  // Auto-detect the host URL based on the script source
  const HOST_URL = new URL(SCRIPT_TAG.src).origin; 
  
  if (!AGENT_ID) {
    console.error('Agent Builder Widget: Missing data-agent-id attribute');
    return;
  }

  // Create Styles
  const style = document.createElement('style');
  style.innerHTML = `
    .ab-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    .ab-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background-color: #2563eb;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    
    .ab-widget-button:hover {
      transform: scale(1.05);
    }
    
    .ab-widget-icon {
      width: 30px;
      height: 30px;
      fill: white;
    }
    
    .ab-widget-iframe-container {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 5px 40px rgba(0,0,0,0.16);
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px);
      transition: all 0.3s ease;
      z-index: 999999;
    }
    
    .ab-widget-iframe-container.open {
      opacity: 1;
      pointer-events: all;
      transform: translateY(0);
    }
    
    .ab-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    @media (max-width: 480px) {
      .ab-widget-iframe-container {
        width: calc(100vw - 40px);
        bottom: 90px;
        right: 20px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create Container
  const container = document.createElement('div');
  container.className = 'ab-widget-container';
  
  // Create Iframe Container
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'ab-widget-iframe-container';
  
  const iframe = document.createElement('iframe');
  iframe.className = 'ab-widget-iframe';
  iframe.src = `${HOST_URL}/embed/${AGENT_ID}`;
  iframeContainer.appendChild(iframe);
  document.body.appendChild(iframeContainer);

  // Create Button
  const button = document.createElement('div');
  button.className = 'ab-widget-button';
  button.innerHTML = `
    <svg class="ab-widget-icon" viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
  `;
  container.appendChild(button);
  document.body.appendChild(container);

  // Toggle Logic
  let isOpen = false;
  button.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.classList.add('open');
      button.innerHTML = `
        <svg class="ab-widget-icon" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      `;
    } else {
      iframeContainer.classList.remove('open');
      button.innerHTML = `
        <svg class="ab-widget-icon" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      `;
    }
  });

})();
