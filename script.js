document.addEventListener('DOMContentLoaded', function() {
    // Elementos principais
    const body = document.body;
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const app = document.getElementById('app');
    const contactOverlay = document.getElementById('contactOverlay');
    const contactText = document.getElementById('contactText');
    const contactFields = document.getElementById('contactFields');
    const contactName = document.getElementById('contactName');
    const contactEmail = document.getElementById('contactEmail');
    const contactPhone = document.getElementById('contactPhone');
    const countryCode = document.getElementById('countryCode');
    const countryFlag = document.getElementById('countryFlag');
    const countryCodeDisplay = document.getElementById('countryCodeDisplay');
    const phoneContainer = document.querySelector('.phone-input-container');
    const contactButton = document.getElementById('contactButton');
    
    // Estado da animação
    let isBlinking = false;
    let currentPage = 'apps';
    let areEyelidsClosed = false;
    
    // Cache de conteúdo
    let contentCache = {};
    
    // Mapeamento de páginas para arquivos HTML
    const pageFiles = {
        'apps': 'apps.html',
        'value': 'value.html',
        'knowledge': 'knowledge.html',
        'insights': 'insights.html',
        'contact': 'contact',
        'privacy': 'privacy.html',
        'terms': 'terms.html',
        'mission': 'mission.html',
        'vision': 'vision.html',
        'values': 'values.html',
        'company-statute': 'company-statute.html',
        'energy': 'apps/energy.html',
        'automacao-industrial': 'apps/automacao-industrial.html',
        'health-biotech': 'apps/health-biotech.html',
        'education': 'apps/education.html'
    };
    
    // ================= NOVAS FUNÇÕES PARA FADEOUT DO OVERLAY =================
    
    function fadeOutContactOverlay() {
        return new Promise((resolve) => {
            console.log('Iniciando fadeout do overlay de contato...');
            
            // Adicionar classes de fadeout
            contactButton.classList.add('fade-out-button');
            contactFields.classList.add('fade-out-fields');
            contactText.classList.add('fade-out-text');
            
            // Aguardar animação completar (0.9s total)
            setTimeout(() => {
                // Esconder completamente o overlay
                contactOverlay.style.display = 'none';
                
                // Remover classes de fadeout para próxima vez
                contactButton.classList.remove('fade-out-button');
                contactFields.classList.remove('fade-out-fields');
                contactText.classList.remove('fade-out-text');
                
                // Remover animações de entrada
                contactText.style.animation = 'none';
                contactFields.style.animation = 'none';
                contactButton.style.animation = 'none';
                
                console.log('Fadeout do overlay completo');
                resolve();
            }, 900); // 0.9s para todas as animações
        });
    }
    
    function resetOverlayAnimations() {
        // Resetar animações dos elementos do overlay
        contactText.style.animation = '';
        contactFields.style.animation = '';
        contactButton.style.animation = '';
        
        // Resetar opacidade
        contactText.style.opacity = '0';
        contactFields.style.opacity = '0';
        contactButton.style.opacity = '0';
    }
    
    // ✅ FUNÇÃO PARA ATUALIZAR O MENU ATIVO
    function updateActiveMenu(pageId) {
        console.log(`Atualizando menu ativo para: ${pageId}`);
        
        document.querySelectorAll('nav a[data-page], .footer-mobile-btn[data-page]').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelectorAll(`nav a[data-page="${pageId}"]`).forEach(link => {
            link.classList.add('active');
        });
        
        document.querySelectorAll(`.footer-mobile-btn[data-page="${pageId}"]`).forEach(link => {
            link.classList.add('active');
        });
    }
    
    // Função para limpar tags de arquivo
    function cleanFileTags(html) {
        let cleaned = html.replace(/^[\s\S]*?<div[^>]*>/i, function(match) {
            const divMatch = match.match(/<div[^>]*>/i);
            if (divMatch) return divMatch[0];
            return match;
        });
        
        if (!cleaned.trim().startsWith('<')) {
            cleaned = cleaned.replace(/^[\s\S]*?(<html|<head|<body|<div|<section|<article)/i, '$1');
        }
        
        cleaned = cleaned.replace(/\[file name\]:.*?\n/gi, '');
        cleaned = cleaned.replace(/\[file content begin\]/gi, '');
        cleaned = cleaned.replace(/\[file content end\]/gi, '');
        cleaned = cleaned.replace(/<!DOCTYPE html>.*?<html[^>]*>/gis, '');
        cleaned = cleaned.replace(/<head>.*?<\/head>/gis, '');
        cleaned = cleaned.replace(/<body[^>]*>|<\/body>/gi, '');
        
        return cleaned.trim();
    }
    
    function extractBodyContent(html) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) return bodyMatch[1].trim();
        return cleanFileTags(html);
    }
    
    // ✅ Sincronização para insights.html
    function waitForInsightsGrid() {
        return new Promise((resolve) => {
            if (window.insightsGridReady) {
                console.log('Grid do insights já está pronto');
                resolve();
                return;
            }
            
            console.log('Aguardando grid do insights ficar pronto...');
            
            const onGridReady = () => {
                console.log('Evento insightsGridReady recebido');
                window.removeEventListener('insightsGridReady', onGridReady);
                resolve();
            };
            
            window.addEventListener('insightsGridReady', onGridReady);
            
            setTimeout(() => {
                console.log('Timeout de segurança do grid do insights (150ms)');
                window.removeEventListener('insightsGridReady', onGridReady);
                resolve();
            }, 150);
        });
    }
    
    // ✅ Sincronização para apps.html
    function waitForAppsGrid() {
        return new Promise((resolve) => {
            if (window.appsGridReady) {
                console.log('Grid do apps já está pronto');
                resolve();
                return;
            }
            
            console.log('Aguardando grid do apps ficar pronto...');
            
            const onGridReady = () => {
                console.log('Evento appsGridReady recebido');
                window.removeEventListener('appsGridReady', onGridReady);
                resolve();
            };
            
            window.addEventListener('appsGridReady', onGridReady);
            
            setTimeout(() => {
                console.log('Timeout de segurança do grid do apps (150ms)');
                window.removeEventListener('appsGridReady', onGridReady);
                resolve();
            }, 150);
        });
    }
    
    // ✅ EXECUÇÃO DE SCRIPTS SIMPLIFICADA
    function executeScripts(element, pageId) {
        return new Promise((resolve) => {
            console.log(`Executando scripts para: ${pageId}`);
            
            const scripts = element.querySelectorAll('script');
            
            if (scripts.length === 0) {
                checkCompletion();
                return;
            }
            
            let scriptsProcessed = 0;
            
            scripts.forEach(oldScript => {
                if (oldScript.src) {
                    const newScript = document.createElement('script');
                    newScript.src = oldScript.src;
                    
                    if (oldScript.type) newScript.type = oldScript.type;
                    if (oldScript.async) newScript.async = oldScript.async;
                    if (oldScript.defer) newScript.defer = oldScript.defer;
                    
                    newScript.onload = () => {
                        scriptsProcessed++;
                        if (scriptsProcessed === scripts.length) checkCompletion();
                    };
                    
                    newScript.onerror = () => {
                        scriptsProcessed++;
                        if (scriptsProcessed === scripts.length) checkCompletion();
                    };
                    
                    document.head.appendChild(newScript);
                } else {
                    try {
                        const scriptContent = oldScript.textContent.trim();
                        if (scriptContent) {
                            const inlineFunction = new Function(scriptContent);
                            inlineFunction();
                        }
                    } catch (error) {
                        console.error('Erro ao executar script inline:', error);
                    } finally {
                        scriptsProcessed++;
                        if (scriptsProcessed === scripts.length) checkCompletion();
                    }
                }
            });
            
            function checkCompletion() {
                if (pageId === 'insights') {
                    waitForInsightsGrid().then(resolve);
                } else if (pageId === 'apps') {
                    waitForAppsGrid().then(resolve);
                } else {
                    resolve();
                }
            }
            
            setTimeout(() => {
                if (scriptsProcessed < scripts.length) {
                    console.log(`Timeout de scripts: ${scriptsProcessed}/${scripts.length}`);
                    checkCompletion();
                }
            }, 3000);
        });
    }
    
    function applyStyles(element) {
        const styles = element.querySelectorAll('style');
        styles.forEach(style => {
            const newStyle = style.cloneNode(true);
            document.head.appendChild(newStyle);
        });
    }
    
    // ✅ FUNÇÃO PARA CARREGAR CONTEÚDO
    async function loadPageContent(pageId) {
        if (!pageFiles[pageId]) {
            pageId = 'apps';
        }
        
        // Verificar se já temos no cache
        if (contentCache[pageId]) {
            console.log(`Usando conteúdo em cache para: ${pageId}`);
            return contentCache[pageId];
        }
        
        const fileName = pageFiles[pageId];
        
        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error(`Erro ao carregar ${fileName}: ${response.status}`);
            }
            
            let html = await response.text();
            let cleanHtml = extractBodyContent(html);
            
            if (cleanHtml.includes('[file name]')) {
                cleanHtml = cleanFileTags(cleanHtml);
            }
            
            // Armazenar no cache
            contentCache[pageId] = cleanHtml;
            
            return cleanHtml;
            
        } catch (error) {
            console.error('Erro ao carregar conteúdo:', error);
            throw error;
        }
    }
    
    // ✅ FUNÇÃO PARA INSERIR CONTEÚDO
    async function insertContent(html, pageId) {
        return new Promise((resolve) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            let firstChild = tempDiv.firstChild;
            while (firstChild && firstChild.nodeType === 3 && firstChild.textContent.trim() === '') {
                tempDiv.removeChild(firstChild);
                firstChild = tempDiv.firstChild;
            }
            
            app.innerHTML = '';
            
            if (tempDiv.firstChild) {
                while (tempDiv.firstChild) {
                    app.appendChild(tempDiv.firstChild);
                }
            }
            
            currentPage = pageId;
            updateActiveMenu(pageId);
            
            if (nav.classList.contains('open')) {
                nav.classList.remove('open');
            }
            
            applyStyles(app);
            
            executeScripts(app, pageId).then(() => {
                window.dispatchEvent(new CustomEvent('pageLoaded', {
                    detail: { page: pageId }
                }));
                resolve();
            });
        });
    }
    
    // ✅ FUNÇÃO APENAS PARA FECHAR PÁLPEBRAS (CONTATO) - ATUALIZADA
    async function justCloseEyelids() {
        if (isBlinking) return;
        
        isBlinking = true;
        
        try {
            console.log('Apenas fechando pálpebras para Contact...');
            
            // 1. Iniciar fechamento das pálpebras
            body.classList.add('blinking');
            void header.offsetHeight;
            
            // 2. Aguardar fechamento completo (700ms)
            await new Promise(resolve => setTimeout(resolve, 700));
            
            console.log('Pálpebras fechadas completamente - Contact');
            
            // 3. Adicionar estado de pálpebras fechadas
            body.classList.add('eyelids-closed');
            areEyelidsClosed = true;
            updateActiveMenu('contact');
            currentPage = 'contact';
            
            // 4. Resetar animações do overlay
            contactText.style.animation = 'fadeIn 0.5s ease forwards';
            contactText.style.animationDelay = '0.2s';
            
            contactFields.style.animation = 'fadeIn 0.5s ease forwards';
            contactFields.style.animationDelay = '1.0s';
            
            contactButton.style.animation = 'fadeIn 0.5s ease forwards';
            contactButton.style.animationDelay = '1.4s';
            
            // 5. Mostrar overlay com campos
            contactOverlay.style.display = 'flex';
            
            // 6. Resetar campos do formulário
            resetFormState();
            contactName.value = '';
            contactEmail.value = '';
            contactPhone.value = '';
            
            // 7. Focar no primeiro campo
            setTimeout(() => {
                contactName.focus();
            }, 300);
            
            console.log('Pálpebras permanecem fechadas - overlay de contato visível');
            
        } catch (error) {
            console.error('Erro ao fechar pálpebras:', error);
            body.classList.remove('blinking', 'eyelids-closed');
            areEyelidsClosed = false;
        } finally {
            isBlinking = false;
        }
    }
    
    // ✅ FUNÇÃO OTIMIZADA PARA ABRIR PÁLPEBRAS E CARREGAR PÁGINA
    async function openEyelidsAndLoadPage(pageId) {
        if (isBlinking) return;
        
        isBlinking = true;
        
        try {
            console.log(`Carregando: ${pageId}`);
            
            // 1. INICIAR FECHAMENTO DAS PÁLPEBRAS (700ms)
            body.classList.add('blinking');
            void header.offsetHeight;
            
            // 2. AGUARDAR FECHAMENTO COMPLETO
            await new Promise(resolve => setTimeout(resolve, 700));
            
            // 3. CARREGAR CONTEÚDO ENQUANTO ESTÁ OCULTO
            body.classList.add('content-hidden');
            const newContent = await loadPageContent(pageId);
            
            // 4. INSERIR CONTEÚDO
            await insertContent(newContent, pageId);
            
            // 5. REMOVER ESTADOS E AGUARDAR ABERTURA
            body.classList.remove('content-hidden', 'blinking');
            
            // 6. AGUARDAR ABERTURA DAS PÁLPEBRAS (700ms)
            await new Promise(resolve => setTimeout(resolve, 700));
            
            console.log(`Página ${pageId} carregada com sucesso`);
            
        } catch (error) {
            console.error('Erro durante transição:', error);
            body.classList.remove('blinking', 'content-hidden');
            
            app.innerHTML = `<div style="max-width:1200px; margin:0 auto; padding:40px 24px;">
                <h1>Erro de Transição</h1>
                <p>A página não pôde ser carregada. Tente novamente.</p>
                <p><small>${error.message}</small></p>
            </div>`;
        } finally {
            isBlinking = false;
        }
    }
    
    // ✅ FUNÇÃO PRINCIPAL PARA NAVEGAÇÃO (ATUALIZADA)
    async function navigateToPage(pageId) {
        if (isBlinking) return;
        
        console.log(`Navegando para: ${pageId}, estado atual: ${currentPage}, pálpebras fechadas: ${areEyelidsClosed}`);
        
        // Se já está na mesma página, recarregar (exceto contact)
        if (pageId === currentPage && pageId !== 'contact') {
            console.log(`Recarregando mesma página: ${pageId}`);
            await openEyelidsAndLoadPage(pageId);
            return;
        }
        
        // Se for Contact, apenas fechar pálpebras
        if (pageId === 'contact') {
            // Se já está no contact e as pálpebras estão fechadas, focar no formulário
            if (areEyelidsClosed && currentPage === 'contact') {
                console.log('Já está no overlay de contato, focando no formulário...');
                contactName.focus();
                return;
            }
            
            // Se veio de outra página, fechar pálpebras normalmente
            await justCloseEyelids();
            return;
        }
        
        // Se as pálpebras estão fechadas (overlay de contato visível)
        if (areEyelidsClosed) {
            console.log('Pálpebras fechadas (overlay visível), iniciando fadeout...');
            
            // 1. Primeiro fazer fadeout do overlay
            await fadeOutContactOverlay();
            
            // 2. Aguardar um pouco para transição suave
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 3. Remover estado de pálpebras fechadas
            body.classList.remove('eyelids-closed');
            areEyelidsClosed = false;
            
            // 4. Agora fazer transição normal para nova página
            await openEyelidsAndLoadPage(pageId);
            return;
        }
        
        // Para outras páginas, fazer transição normal
        await openEyelidsAndLoadPage(pageId);
    }
    
    // ✅ FUNÇÕES DE VALIDAÇÃO
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function validatePhone(phone, countryCode) {
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (countryCode === '+55') {
            return cleanPhone.length >= 10 && cleanPhone.length <= 11;
        } else if (countryCode === '+1') {
            return cleanPhone.length === 10;
        } else if (countryCode === '+44') {
            return cleanPhone.length >= 10 && cleanPhone.length <= 11;
        }
        
        return cleanPhone.length >= 8 && cleanPhone.length <= 15;
    }
    
    // ✅ ATUALIZAR BANDEIRA E CÓDIGO
    function updateCountryDisplay() {
        const selectedOption = countryCode.options[countryCode.selectedIndex];
        const country = selectedOption.getAttribute('data-country');
        const displayCode = selectedOption.getAttribute('data-display');
        
        countryFlag.className = 'flag-icon';
        if (country) {
            countryFlag.classList.add(`flag-icon-${country}`);
        } else {
            countryFlag.classList.add('flag-icon-br');
        }
        
        countryCodeDisplay.textContent = displayCode || '+55';
    }
    
    // ✅ FUNÇÃO PARA RESETAR ESTADO DO FORMULÁRIO
    function resetFormState() {
        body.classList.remove('form-sending', 'form-success');
        contactButton.classList.remove('sending', 'success');
        
        const sendIcon = contactButton.querySelector('.send-icon');
        const successIcon = contactButton.querySelector('.success-icon');
        sendIcon.style.display = 'block';
        successIcon.style.display = 'none';
        
        contactButton.innerHTML = `
            <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg class="success-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Start a new level
        `;
        
        contactButton.disabled = false;
    }
    
    // ✅ FUNÇÃO PARA ENVIAR O FORMULÁRIO (ATUALIZADA)
    async function handleContactSubmit() {
        const userName = contactName.value.trim();
        const userEmail = contactEmail.value.trim();
        const userPhone = contactPhone.value.trim();
        const selectedCountryCode = countryCode.value;
        
        if (!userName) {
            contactName.focus();
            contactName.style.borderColor = '#ef4444';
            contactName.style.boxShadow = 'inset 0 2px 8px rgba(239, 68, 68, 0.2)';
            
            setTimeout(() => {
                contactName.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                contactName.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 4px 8px rgba(0, 0, 0, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.1)';
            }, 1000);
            return;
        }
        
        if (!validateEmail(userEmail)) {
            contactEmail.focus();
            contactEmail.style.borderColor = '#ef4444';
            contactEmail.style.boxShadow = 'inset 0 2px 8px rgba(239, 68, 68, 0.2)';
            
            setTimeout(() => {
                contactEmail.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                contactEmail.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 4px 8px rgba(0, 0, 0, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.1)';
            }, 1000);
            return;
        }
        
        if (!validatePhone(userPhone, selectedCountryCode)) {
            contactPhone.focus();
            phoneContainer.style.borderColor = '#ef4444';
            phoneContainer.style.boxShadow = 'inset 0 2px 8px rgba(239, 68, 68, 0.2)';
            
            setTimeout(() => {
                phoneContainer.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                phoneContainer.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 4px 8px rgba(0, 0, 0, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.1)';
            }, 1000);
            return;
        }
        
        const fullPhone = selectedCountryCode + ' ' + userPhone;
        
        body.classList.add('form-sending');
        contactButton.classList.add('sending');
        contactButton.disabled = true;
        
        const sendIcon = contactButton.querySelector('.send-icon');
        const successIcon = contactButton.querySelector('.success-icon');
        sendIcon.style.display = 'block';
        successIcon.style.display = 'none';
        contactButton.innerHTML = `
            <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg class="success-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Enviando...
        `;
        
        try {
            const formData = new FormData();
            
            formData.append('xnQsjsdp', '8d95bdfb5b73afc876e415d38265ee44ea4e16219b8d6c14d8320dff8a19bb03');
            formData.append('zc_gad', '');
            formData.append('xmIwtLD', '4e5b6b764f8680ee88fd2b8fff4fc4e336e5053489d1c898236353aa5d92a3d8d7c6c1833286ecb62f477ecf39c41a3e');
            formData.append('actionType', 'TGVhZHM=');
            formData.append('returnURL', 'null');
            formData.append('Company', userName);
            formData.append('Last Name', userEmail);
            formData.append('Phone', fullPhone);
            formData.append('aG9uZXlwb3Q', '');
            
            const response = await fetch('https://crm.zoho.com/crm/WebToLeadForm', {
                method: 'POST',
                body: formData
            });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (response.ok) {
                body.classList.remove('form-sending');
                body.classList.add('form-success');
                contactButton.classList.remove('sending');
                contactButton.classList.add('success');
                
                const newSendIcon = contactButton.querySelector('.send-icon');
                const newSuccessIcon = contactButton.querySelector('.success-icon');
                newSendIcon.style.display = 'none';
                newSuccessIcon.style.display = 'block';
                contactButton.innerHTML = `
                    <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="success-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Agradecemos pelo interesse. Entraremos em contato em breve!
                `;
                
                contactName.value = '';
                contactEmail.value = '';
                contactPhone.value = '';
                
                setTimeout(() => {
                    body.classList.remove('form-success', 'eyelids-closed');
                    areEyelidsClosed = false;
                    resetFormState();
                    
                    // ✅ AGORA USAMOS fadeOutContactOverlay ANTES DE ABRIR PÁLPEBRAS
                    fadeOutContactOverlay().then(() => {
                        // Remover estado de pálpebras fechadas
                        body.classList.remove('eyelids-closed');
                        areEyelidsClosed = false;
                        
                        // Agora fazer transição para a página 'value'
                        navigateToPage('value');
                    });
                }, 5000);
                
            } else {
                throw new Error('Erro no envio para o CRM');
            }
            
        } catch (error) {
            console.error('Erro ao enviar para Zoho CRM:', error);
            
            contactButton.classList.remove('sending');
            contactButton.classList.add('success');
            contactButton.innerHTML = `
                <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                    <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg class="success-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="fill: #E74C3C;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Erro ao enviar. Tente novamente.
            `;
            
            setTimeout(() => {
                body.classList.remove('form-sending');
                contactButton.classList.remove('success');
                resetFormState();
                contactButton.disabled = false;
            }, 3000);
        }
    }
    
    function showZohoMessage(message, isSuccess = true) {
        let messageBox = document.getElementById('zohoMessageBox');
        
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.id = 'zohoMessageBox';
            messageBox.className = 'wf_customMessageBox';
            messageBox.innerHTML = `
                <div class="wf_customCircle">
                    <div class="wf_customCheckMark"></div>
                </div>
                <span id="zohoMessageText">${message}</span>
                <div class="wf_customClose" id="zohoMessageClose"></div>
            `;
            document.body.appendChild(messageBox);
            
            document.getElementById('zohoMessageClose').addEventListener('click', function() {
                hideZohoMessage();
            });
        } else {
            document.getElementById('zohoMessageText').textContent = message;
        }
        
        if (isSuccess) {
            messageBox.style.background = '#F5FAF5';
            messageBox.style.borderColor = '#A9D3AB';
            messageBox.style.color = '#132C14';
            messageBox.querySelector('.wf_customCircle').style.backgroundColor = '#12AA67';
        } else {
            messageBox.style.background = '#FEF5F5';
            messageBox.style.borderColor = '#F5B2B2';
            messageBox.style.color = '#5C1A1A';
            messageBox.querySelector('.wf_customCircle').style.backgroundColor = '#E74C3C';
        }
        
        messageBox.classList.add('show');
        messageBox.style.animation = 'zohoMessageSlideIn 0.3s ease forwards';
        
        setTimeout(() => {
            hideZohoMessage();
        }, 5000);
    }
    
    function hideZohoMessage() {
        const messageBox = document.getElementById('zohoMessageBox');
        if (messageBox) {
            messageBox.style.animation = 'zohoMessageSlideOut 0.3s ease forwards';
            setTimeout(() => {
                messageBox.classList.remove('show');
            }, 300);
        }
    }
    
    // ✅ EVENT LISTENERS
    contactButton.addEventListener('click', handleContactSubmit);
    countryCode.addEventListener('change', updateCountryDisplay);
    updateCountryDisplay();
    
    [contactName, contactEmail, contactPhone].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleContactSubmit();
            }
        });
    });
    
    contactPhone.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (countryCode.value === '+55') {
            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
        } else if (countryCode.value === '+1') {
            if (value.length > 6) {
                value = value.replace(/^(\d{3})(\d{3})(\d{0,4}).*/, '($1) $2-$3');
            } else if (value.length > 3) {
                value = value.replace(/^(\d{3})(\d{0,3})/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
        } else if (countryCode.value === '+44') {
            if (value.length > 10) {
                value = value.replace(/^(\d{4})(\d{3})(\d{4}).*/, '$1 $2 $3');
            } else if (value.length > 7) {
                value = value.replace(/^(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3');
            } else if (value.length > 4) {
                value = value.replace(/^(\d{2})(\d{0,8})/, '$1 $2');
            }
        }
        
        e.target.value = value;
    });
    
    phoneContainer.addEventListener('click', function(e) {
        if (e.target !== countryCode) {
            contactPhone.focus();
        }
    });
    
    menuToggle.addEventListener('click', function() {
        nav.classList.toggle('open');
    });
    
    document.addEventListener('click', function(e) {
        if (window.innerWidth < 768 && 
            !nav.contains(e.target) && 
            !menuToggle.contains(e.target) && 
            nav.classList.contains('open')) {
            nav.classList.remove('open');
        }
    });
    
    // ✅ HANDLER GLOBAL PARA TODOS OS MENUS (ATUALIZADO)
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        
        if (!link) return;
        
        const href = link.getAttribute('href');
        const pageId = link.getAttribute('data-page');
        
        if (href && (href.startsWith('http') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:') || 
            href.startsWith('#') ||
            href.includes('://')
        )) {
            return;
        }
        
        e.preventDefault();
        
        if (pageId) {
            console.log(`Link clicado: ${pageId}, página atual: ${currentPage}`);
            
            // Se clicar no mesmo item do menu (exceto contact), recarregar a página
            if (pageId === currentPage && pageId !== 'contact') {
                console.log(`Mesmo item de menu clicado: ${pageId}, RECARREGANDO...`);
                navigateToPage(pageId);
                return;
            }
            
            // Navegar para a página
            navigateToPage(pageId);
            return;
        }
        
        if (href && href.endsWith('.html')) {
            const fileName = href.replace('.html', '');
            if (pageFiles[fileName]) {
                navigateToPage(fileName);
            } else {
                console.warn(`Página não mapeada: ${href}`);
                // Tentar carregar mesmo assim
                navigateToPage(fileName);
            }
            return;
        }
    });
    
    window.blinkAnimation = navigateToPage;
    
    window.addEventListener('triggerBlink', function (e) {
        if (!e.detail || !e.detail.page) return;
        navigateToPage(e.detail.page);
    });
        
    // ✅ EXECUTAR CARREGAMENTO INICIAL SIMPLIFICADO
    setTimeout(() => {
        initialLoad();
        
        // Resetar animações do overlay no carregamento inicial
        resetOverlayAnimations();
    }, 100);
    
    // ✅ FUNÇÃO PRINCIPAL: Carregamento inicial
    async function initialLoad() {
        console.log('Iniciando carregamento inicial');
        
        try {
            // Carregar conteúdo da primeira página
            const content = await loadPageContent('apps');
            
            // Inserir conteúdo no DOM (ainda invisível)
            await insertContent(content, 'apps');
            
            // Aguardar um frame para garantir renderização
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Remover classe de loading e iniciar animação de abertura
            body.classList.remove('initial-loading');
            
            // Aguardar animação de abertura completa (700ms)
            await new Promise(resolve => setTimeout(resolve, 700));
            
            console.log('Carregamento inicial completo');
            
        } catch (error) {
            console.error('Erro durante o carregamento inicial:', error);
            body.classList.remove('initial-loading');
            
            app.innerHTML = `<div style="max-width:1200px; margin:0 auto; padding:40px 24px;">
                <h1>Erro de Carregamento</h1>
                <p>A página inicial não pôde ser carregada. Tente novamente.</p>
                <p><small>${error.message}</small></p>
            </div>`;
        }
    }
    
    // ✅ CONFIGURAR BOTÕES DO FOOTER MOBILE
    function setupMobileFooterButtons() {
        const mobileAppBtn = document.querySelector('.footer-mobile-btn[data-page="apps"]');
        const mobileKnowledgeBtn = document.querySelector('.footer-mobile-btn[data-page="knowledge"]');
        const mobileInsightsBtn = document.querySelector('.footer-mobile-btn[data-page="insights"]');
        
        if (mobileAppBtn) {
            mobileAppBtn.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToPage('apps');
            });
        }
        
        if (mobileKnowledgeBtn) {
            mobileKnowledgeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToPage('knowledge');
            });
        }
        
        if (mobileInsightsBtn) {
            mobileInsightsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToPage('insights');
            });
        }
    }
    
    // Inicializar botões do footer mobile
    setupMobileFooterButtons();
    
    // ✅ CARREGAR PAÍSES
    async function loadAllCountries() {
        try {
            console.log('Carregando lista completa de países...');
            
            const response = await fetch('countries.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const countries = await response.json();
            console.log(`✓ ${countries.length} países carregados com sucesso`);
            
            populateCountrySelect(countries);
            
        } catch (error) {
            console.error('❌ Erro ao carregar países:', error);
            console.log('⚠️ Mantendo lista original de países como fallback');
        }
    }
    
    function populateCountrySelect(countries) {
        const countrySelect = document.getElementById('countryCode');
        if (!countrySelect) {
            console.error('❌ Elemento select com id="countryCode" não encontrado!');
            return;
        }
        
        countries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        
        let optionsHTML = '';
        
        countries.forEach(country => {
            const selected = country.code === 'br' ? 'selected' : '';
            
            optionsHTML += `
                <option value="${country.dialCode}" 
                        data-country="${country.code}" 
                        data-display="${country.dialCode}" 
                        data-fullname="${country.name} (${country.dialCode})"
                        ${selected}>
                    ${country.name} (${country.dialCode})
                </option>`;
        });
        
        countrySelect.innerHTML = optionsHTML;
        
        console.log(`✓ Select atualizado com ${countries.length} países`);
        
        if (typeof updateCountryDisplay === 'function') {
            updateCountryDisplay();
        }
    }
    
    // Chama a função para carregar países
    setTimeout(() => {
        loadAllCountries();
    }, 500);
});