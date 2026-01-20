// editor.js - Sistema Editor de Blog com Carregamento Automático de Componentes

// ========== HELPER GLOBAL PARA URLS DE IMAGEM ==========
// Função global para construção de URL de imagem
window.construirUrlImagem = function(imagemNome, isEditor = false) {
    if (!imagemNome) return '';
    
    // Se já for uma URL completa (começa com http:// ou https://), retorna como está
    if (imagemNome.startsWith('http://') || imagemNome.startsWith('https://')) {
        return imagemNome;
    }
    
    // No editor, usa a URL atual do site
    if (isEditor && typeof window !== 'undefined' && window.location) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/img/${imagemNome}`;
    }
    
    // No artigo gerado, usa caminho relativo à raiz do site
    return `./img/${imagemNome}`;
};

// Função auxiliar para extrair nome do arquivo de uma URL completa
window.extrairNomeArquivo = function(url) {
    if (!url) return '';
    
    // Se for uma URL completa, extrair apenas o nome do arquivo
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const partes = url.split('/');
        return partes[partes.length - 1];
    }
    
    // Se já for um nome de arquivo simples, retornar como está
    return url;
};
// ========== FIM DO HELPER GLOBAL ==========

class EditorBlog {
    constructor() {
        this.componentes = [];
        this.componenteEditando = null;
        this.componentesDisponiveis = {};
        this.isSummernoteLoaded = false;
        this.init();
    }

    async init() {
        try {
            // 1. Carregar todos os componentes da biblioteca
            await this.carregarComponentesBiblioteca();
            
            // 2. Criar botões no painel lateral
            this.criarBotoesComponentes();
            
            // 3. Configurar listeners
            this.setupEventListeners();
            
            // 4. Aguardar carregamento do Summernote
            await this.waitForSummernote();
            
            // 5. Migrar componentes antigos para o novo formato
            this.migrarParaNomesArquivo();
            
            console.log('Editor inicializado com sucesso!');
            console.log(`Componentes carregados: ${Object.keys(this.componentesDisponiveis).length}`);
        } catch (error) {
            console.error('Erro ao inicializar editor:', error);
        }
    }

    // Função para migrar configurações antigas para o novo formato
    migrarParaNomesArquivo() {
        console.log('Verificando componentes antigos para migração...');
        let migrados = 0;
        
        this.componentes.forEach(componente => {
            // Para componentes que usam imagens
            const tiposComImagens = ['text+img', 'img', 'banner'];
            
            if (tiposComImagens.includes(componente.tipo) && componente.config.imagemUrl && !componente.config.imagemNome) {
                const url = componente.config.imagemUrl;
                
                // Extrair nome do arquivo da URL
                if (url.includes('/')) {
                    const partes = url.split('/');
                    const nomeArquivo = partes[partes.length - 1];
                    
                    // Migrar para o novo campo
                    componente.config.imagemNome = nomeArquivo;
                    // Mantém imagemUrl para compatibilidade reversa, mas pode remover
                    // delete componente.config.imagemUrl;
                    
                    migrados++;
                    console.log(`Migrado: ${componente.tipo} - ${nomeArquivo}`);
                }
            }
        });
        
        if (migrados > 0) {
            console.log(`Migração concluída: ${migrados} componentes migrados para o novo formato`);
        }
    }

    /**
     * Helper para construir URL de imagem
     * @param {string} imagemNome - Nome do arquivo da imagem
     * @param {boolean} isEditor - Se está no contexto do editor
     * @returns {string} URL completa da imagem
     */
    construirUrlImagem(imagemNome, isEditor = true) {
        return window.construirUrlImagem(imagemNome, isEditor);
    }

    async carregarComponentesBiblioteca() {
        // Lista de componentes que devem existir na pasta lib/
        const listaComponentes = [
            'text', 'text+img', 'img', 'blockquote', 'cta',
            'hashtags', 'banner', 'sumario-flutuante'
        ];
        
        console.log('Carregando componentes da biblioteca...');
        
        for (const tipo of listaComponentes) {
            await this.carregarComponente(tipo);
        }
    }

    async carregarComponente(tipo) {
        try {
            const response = await fetch(`lib/${tipo}.html`);
            if (!response.ok) {
                console.warn(`Componente ${tipo}.html não encontrado na pasta lib/`);
                return;
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extrair todas as partes do componente
            const componentData = {
                meta: this.extrairMetadados(doc),
                template: this.extrairTemplate(doc),
                form: this.extrairFormulario(doc),
                css: this.extrairCSS(doc),
                js: this.extrairJS(doc)
            };
            
            // Validar dados mínimos
            if (!componentData.meta.name) {
                console.warn(`Componente ${tipo} não tem metadados válidos`);
                return;
            }
            
            this.componentesDisponiveis[tipo] = componentData;
            console.log(`✓ Componente carregado: ${componentData.meta.name} (${tipo})`);
            
        } catch (error) {
            console.error(`Erro ao carregar componente ${tipo}:`, error);
        }
    }

    extrairMetadados(doc) {
        const metaScript = doc.querySelector('script[type="application/json"]');
        if (!metaScript) {
            return { name: 'Sem Nome', icon: '📄' };
        }
        
        try {
            return JSON.parse(metaScript.textContent);
        } catch (error) {
            console.error('Erro ao parsear metadados:', error);
            return { name: 'Erro no JSON', icon: '❌' };
        }
    }

    extrairTemplate(doc) {
        const template = doc.querySelector('template');
        return template ? template.innerHTML.trim() : '';
    }

    extrairFormulario(doc) {
        const form = doc.querySelector('[data-form-template]');
        return form ? form.innerHTML.trim() : '';
    }

    extrairCSS(doc) {
        const style = doc.querySelector('style');
        return style ? style.textContent.trim() : '';
    }

    extrairJS(doc) {
        const scripts = doc.querySelectorAll('script:not([type="application/json"])');
        return Array.from(scripts).map(script => script.textContent.trim()).join('\n');
    }

    criarBotoesComponentes() {
        const container = document.querySelector('.componentes');
        if (!container) {
            console.error('Container de componentes não encontrado!');
            return;
        }
        
        container.innerHTML = '';
        
        // Ordenar componentes por nome
        const componentesOrdenados = Object.entries(this.componentesDisponiveis)
            .sort(([, a], [, b]) => (a.meta.name || '').localeCompare(b.meta.name || ''));
        
        for (const [tipo, componente] of componentesOrdenados) {
            const button = document.createElement('button');
            button.className = 'componente-btn';
            button.dataset.tipo = tipo;
            button.title = componente.meta.description || `Adicionar ${componente.meta.name}`;
            button.innerHTML = `${componente.meta.icon || '📄'} ${componente.meta.name || tipo}`;
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.adicionarComponente(tipo);
            });
            
            container.appendChild(button);
        }
        
        if (componentesOrdenados.length === 0) {
            container.innerHTML = '<p style="color: #ccc; text-align: center;">Nenhum componente carregado</p>';
        }
    }

    adicionarComponente(tipo) {
        const componenteData = this.componentesDisponiveis[tipo];
        if (!componenteData) {
            alert(`Componente ${tipo} não encontrado!`);
            return;
        }
        
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const config = JSON.parse(JSON.stringify(componenteData.meta.defaultConfig || {}));
        
        // Converter imagemUrl para imagemNome se existir no defaultConfig
        if (config.imagemUrl && !config.imagemNome) {
            config.imagemNome = window.extrairNomeArquivo(config.imagemUrl);
        }
        
        const componente = {
            id: id.toString(),
            tipo: tipo,
            config: config
        };
        
        this.componentes.push(componente);
        this.renderizarComponente(componente);
        
        // Remover placeholder se existir
        const placeholder = document.getElementById('bannerPlaceholder');
        if (placeholder) placeholder.style.display = 'none';
        
        console.log(`Componente ${tipo} adicionado com ID: ${id}`);
    }

    renderizarComponente(componente) {
        const container = document.getElementById('componentesContainer');
        const componenteData = this.componentesDisponiveis[componente.tipo];
        
        if (!container || !componenteData) return;
        
        // Criar elemento usando a função de criação do componente
        let elemento;
        
        // Executar o JavaScript do componente para obter a função de criação
        try {
            // Criar um escopo isolado para execução do JS do componente
            // Passa isEditor=true para contexto do editor
            const criarElementoFn = new Function('config', 'id', 'isEditor', componenteData.js + '\nreturn criarElemento(config, id, isEditor);');
            elemento = criarElementoFn(componente.config, componente.id, true);
        } catch (error) {
            console.error(`Erro ao criar elemento do componente ${componente.tipo}:`, error);
            
            // Fallback para método genérico
            elemento = this.criarElementoFromTemplate(componente, true);
            if (!elemento) {
                elemento = this.criarElementoGenerico(componente);
            }
        }
        
        if (!elemento) return;
        
        // Aplicar estilos de largura máxima e centralização para componentes não-banner
        if (componente.tipo !== 'banner' && componente.tipo !== 'sumario-flutuante') {
            elemento.style.maxWidth = '900px';
            elemento.style.marginLeft = 'auto';
            elemento.style.marginRight = 'auto';
            elemento.style.width = '100%';
        }
        
        // Criar HTML do componente com controles
        const componenteHtml = `
            <div class="componente-item" data-id="${componente.id}">
                <div class="componente-header">
                    <h3>${componenteData.meta.name || componente.tipo}</h3>
                    <div class="componente-acoes">
                        <button class="componente-btn-small btn-editar" data-id="${componente.id}">
                            ✏️ Editar
                        </button>
                        <button class="componente-btn-small btn-remover" data-id="${componente.id}">
                            🗑️ Remover
                        </button>
                        <button class="componente-btn-small btn-mover-up" data-id="${componente.id}">
                            ⬆️
                        </button>
                        <button class="componente-btn-small btn-mover-down" data-id="${componente.id}">
                            ⬇️
                        </button>
                    </div>
                </div>
                <div class="componente-conteudo">
                    ${elemento.outerHTML}
                </div>
            </div>
        `;
        
        // Inserir no container
        container.insertAdjacentHTML('beforeend', componenteHtml);
        
        // Aplicar listeners aos botões do componente
        this.attachComponentListeners(componente.id);
        
        // Aplicar CSS específico do componente
        this.aplicarCSSComponente(componente);
        
        // Executar JavaScript do componente (se houver)
        this.executarJSComponente(componente);
    }

    criarElementoFromTemplate(componente, isEditor = false) {
        const componenteData = this.componentesDisponiveis[componente.tipo];
        if (!componenteData.template) return null;
        
        try {
            // Processar template com as configurações do componente
            let templateHTML = componenteData.template;
            
            // Substituir variáveis simples do template pelos valores de config
            Object.keys(componente.config).forEach(key => {
                const value = componente.config[key];
                const regex = new RegExp(`{{${key}}}`, 'g');
                templateHTML = templateHTML.replace(regex, value || '');
            });
            
            // Processar blocos {{#each}} especificamente para sumario-flutuante e hashtags
            if (componente.tipo === 'sumario-flutuante') {
                templateHTML = this.processarTemplateSumario(templateHTML, componente.config);
            } else if (componente.tipo === 'hashtags') {
                templateHTML = this.processarTemplateHashtags(templateHTML, componente.config);
            }
            
            // Adicionar padding se não for banner
            if (componente.tipo !== 'banner') {
                const paddingTop = componente.config.paddingTop || '0';
                const paddingBottom = componente.config.paddingBottom || '32px';
                
                // Adicionar estilo inline para padding
                if (templateHTML.includes('style="')) {
                    templateHTML = templateHTML.replace(
                        'style="',
                        `style="padding-top: ${paddingTop}; padding-bottom: ${paddingBottom}; `
                    );
                } else {
                    // Adicionar atributo style se não existir
                    const classMatch = templateHTML.match(/class="([^"]*)"/);
                    if (classMatch) {
                        templateHTML = templateHTML.replace(
                            'class="',
                            `style="padding-top: ${paddingTop}; padding-bottom: ${paddingBottom};" class="`
                        );
                    }
                }
            }
            
            // Substituir variáveis condicionais (como a animação)
            templateHTML = this.processarCondicionais(templateHTML, componente.config);
            
            // Processar URLs de imagem usando o helper global
            if (componente.config.imagemNome) {
                const imagemUrl = window.construirUrlImagem(componente.config.imagemNome, isEditor);
                templateHTML = templateHTML.replace(/{{imagemUrl}}/g, imagemUrl);
                templateHTML = templateHTML.replace(/{{imagemNome}}/g, componente.config.imagemNome);
            }
            
            // Criar elemento DOM a partir do template
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = templateHTML;
            
            // Extrair o conteúdo do template (se houver tag <template>)
            const templateTag = tempDiv.querySelector('template');
            if (templateTag) {
                // Usar o conteúdo do template
                const content = templateTag.content.cloneNode(true);
                const wrapper = document.createElement('div');
                wrapper.appendChild(content);
                
                // Extrair script e executá-lo depois
                const scripts = wrapper.querySelectorAll('script');
                scripts.forEach(script => {
                    script.remove(); // Remover do DOM, será executado depois
                    componente.scriptContent = script.textContent;
                });
                
                const element = wrapper.firstElementChild || wrapper;
                
                // Aplicar largura máxima para componentes não-banner
                if (componente.tipo !== 'banner' && componente.tipo !== 'sumario-flutuante') {
                    element.style.maxWidth = '900px';
                    element.style.marginLeft = 'auto';
                    element.style.marginRight = 'auto';
                    element.style.width = '100%';
                    element.style.boxSizing = 'border-box';
                }
                
                return element;
            }
            
            const element = tempDiv.firstElementChild || tempDiv;
            
            // Aplicar largura máxima para componentes não-banner
            if (componente.tipo !== 'banner' && componente.tipo !== 'sumario-flutuante') {
                element.style.maxWidth = '900px';
                element.style.marginLeft = 'auto';
                element.style.marginRight = 'auto';
                element.style.width = '100%';
                element.style.boxSizing = 'border-box';
            }
            
            return element;
        } catch (error) {
            console.error(`Erro ao criar elemento do template ${componente.tipo}:`, error);
            return null;
        }
    }

    processarTemplateSumario(templateHTML, config) {
        // Processar blocos {{#each itens}} ... {{/each}}
        const eachRegex = /{{#each itens}}([\s\S]*?){{\/each}}/g;
        return templateHTML.replace(eachRegex, (match, content) => {
            let itens = [];
            if (Array.isArray(config.itens)) {
                itens = config.itens;
            } else if (typeof config.itens === 'string') {
                try {
                    itens = JSON.parse(config.itens);
                } catch (e) {
                    itens = [];
                }
            }
            
            let result = '';
            itens.forEach(item => {
                let itemContent = content;
                // Substituir {{id}} e {{texto}} dentro do bloco
                if (item.id) {
                    itemContent = itemContent.replace(/{{id}}/g, item.id);
                }
                if (item.texto) {
                    itemContent = itemContent.replace(/{{texto}}/g, item.texto);
                }
                result += itemContent;
            });
            return result;
        });
    }

    processarTemplateHashtags(templateHTML, config) {
        // Processar blocos {{#each tags}} ... {{/each}}
        const eachRegex = /{{#each tags}}([\s\S]*?){{\/each}}/g;
        return templateHTML.replace(eachRegex, (match, content) => {
            let tags = [];
            if (Array.isArray(config.tags)) {
                tags = config.tags;
            } else if (typeof config.tags === 'string') {
                tags = config.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
            
            let result = '';
            tags.forEach(tag => {
                let tagContent = content;
                // Substituir {{this}} dentro do bloco
                tagContent = tagContent.replace(/{{this}}/g, tag);
                result += tagContent;
            });
            return result;
        });
    }

    processarCondicionais(templateHTML, config) {
        // Processar condicionais simples como {{condicao ? 'valor1' : 'valor2'}}
        const condicionalRegex = /{{([^}?]+)\s*\?\s*'([^']+)'\s*:\s*'([^']+)'}}/g;
        return templateHTML.replace(condicionalRegex, (match, condicao, valorTrue, valorFalse) => {
            const key = condicao.trim();
            return config[key] ? valorTrue : valorFalse;
        });
    }

    criarElementoGenerico(componente) {
        const componenteData = this.componentesDisponiveis[componente.tipo];
        if (!componenteData) return null;
        
        // Se for banner, já tratamos acima
        if (componente.tipo === 'banner') {
            return null;
        }
        
        const div = document.createElement('div');
        div.className = `${componente.tipo}-component`;
        div.textContent = `Prévia do componente: ${componenteData.meta.name || componente.tipo}`;
        div.style.padding = '20px';
        div.style.border = '1px dashed #e2e8f0';
        div.style.borderRadius = '8px';
        div.style.color = '#64748b';
        div.style.maxWidth = '900px';
        div.style.marginLeft = 'auto';
        div.style.marginRight = 'auto';
        div.style.width = '100%';
        div.style.boxSizing = 'border-box';
        div.style.paddingTop = componente.config.paddingTop || '0';
        div.style.paddingBottom = componente.config.paddingBottom || '32px';
        
        return div;
    }

    aplicarCSSComponente(componente) {
        const componenteData = this.componentesDisponiveis[componente.tipo];
        if (!componenteData || !componenteData.css) return;
        
        const styleId = `style-${componente.id}`;
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = componenteData.css;
            document.head.appendChild(style);
        }
    }

    executarJSComponente(componente) {
        const componenteData = this.componentesDisponiveis[componente.tipo];
        if (!componenteData.js) return;
        
        try {
            // Encontrar o elemento do componente
            const componenteEl = document.querySelector(`[data-id="${componente.id}"] .componente-conteudo`);
            if (!componenteEl) return;
            
            // Executar JavaScript do componente (se houver execução adicional)
            // O JS principal já foi executado na criação do elemento
        } catch (error) {
            console.error(`Erro ao executar JS do componente ${componente.tipo}:`, error);
        }
    }

    attachComponentListeners(id) {
        const componenteEl = document.querySelector(`[data-id="${id}"]`);
        if (!componenteEl) return;

        // Editar
        componenteEl.querySelector('.btn-editar').addEventListener('click', (e) => {
            e.stopPropagation();
            this.editarComponente(id);
        });

        // Remover
        componenteEl.querySelector('.btn-remover').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removerComponente(id);
        });

        // Mover para cima
        componenteEl.querySelector('.btn-mover-up').addEventListener('click', (e) => {
            e.stopPropagation();
            this.moverComponente(id, 'up');
        });

        // Mover para baixo
        componenteEl.querySelector('.btn-mover-down').addEventListener('click', (e) => {
            e.stopPropagation();
            this.moverComponente(id, 'down');
        });
    }

    adicionarCamposPadding(formHtml, componente) {
        // Padrão de padding para todos os componentes (exceto banner)
        const paddingTop = componente.config?.paddingTop || '0';
        const paddingBottom = componente.config?.paddingBottom || '32px';
        
        // Verificar se já existem campos de padding no formulário
        if (!formHtml.includes('editPaddingTop')) {
            const paddingFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Padding Superior</label>
                        <input type="text" id="editPaddingTop" value="${paddingTop}" placeholder="0">
                        <small style="color: #64748b; font-size: 0.8rem;">Ex: 0, 16px, 2rem</small>
                    </div>
                    <div class="form-group">
                        <label>Padding Inferior</label>
                        <input type="text" id="editPaddingBottom" value="${paddingBottom}" placeholder="32px">
                        <small style="color: #64748b; font-size: 0.8rem;">Ex: 32px, 2rem, 0</small>
                    </div>
                </div>
            `;
            
            // Inserir antes do fechamento do formulário
            formHtml = formHtml.replace('</div>', `${paddingFields}</div>`);
        }
        
        return formHtml;
    }

    // Função editarComponente - ATUALIZADA
    editarComponente(id) {
        this.componenteEditando = this.componentes.find(c => c.id === id);
        if (!this.componenteEditando) return;
        
        const componenteData = this.componentesDisponiveis[this.componenteEditando.tipo];
        if (!componenteData) return;
        
        console.log('=== Editando componente ===');
        console.log('ID:', id);
        console.log('Tipo:', this.componenteEditando.tipo);
        console.log('Config atual:', this.componenteEditando.config);
        
        document.getElementById('modalTitulo').textContent = `Editar ${componenteData.meta.name || this.componenteEditando.tipo}`;
        
        let formHtml = componenteData.form || '';
        
        // Primeiro: substituir todas as variáveis simples
        Object.keys(this.componenteEditando.config).forEach(key => {
            const value = this.componenteEditando.config[key];
            const regex = new RegExp(`{{${key}}}`, 'g');
            
            if (value !== undefined && value !== null) {
                // Para valores booleanos, converter para string
                const stringValue = typeof value === 'boolean' ? (value ? 'checked' : '') : value;
                formHtml = formHtml.replace(regex, stringValue);
                
                // Debug: verificar valores importantes
                if (key === 'tamanhoImagem') {
                    console.log(`Preenchendo ${key}: ${value}`);
                }
            }
        });
        
        // Para sumário-flutuante e hashtags, processar arrays especificamente
        if (this.componenteEditando.tipo === 'sumario-flutuante') {
            // Converter array de itens para string formatada
            const itens = this.componenteEditando.config.itens || [];
            const itensFormatados = Array.isArray(itens) 
                ? itens.map(item => `${item.id}|${item.texto}`).join('\n')
                : '';
            formHtml = formHtml.replace(/{{itensFormatados}}/g, itensFormatados);
        }
        
        if (this.componenteEditando.tipo === 'hashtags') {
            // Converter array de tags para string formatada
            const tags = this.componenteEditando.config.tags || [];
            const tagsString = Array.isArray(tags) 
                ? tags.join(', ')
                : typeof tags === 'string' ? tags : '';
            formHtml = formHtml.replace(/{{tagsString}}/g, tagsString);
        }
        
        // Processar condições condicionais ({{#ifeq ...}} e {{#if ...}})
        formHtml = this.processarCondicionaisFormulario(formHtml);
        
        // Preencher selects com valores selecionados
        formHtml = this.preencherSelectsNoFormulario(formHtml);
        
        // ADICIONAR CAMPOS DE PADDING PARA TODOS OS COMPONENTES (exceto banner)
        if (this.componenteEditando.tipo !== 'banner') {
            formHtml = this.adicionarCamposPadding(formHtml, this.componenteEditando);
        }
        
        // Garantir que o valor do range seja um número válido para texto+img
        if (this.componenteEditando.tipo === 'text+img') {
            const tamanhoImagem = parseInt(this.componenteEditando.config.tamanhoImagem) || 50;
            console.log(`Garantindo tamanhoImagem válido: ${tamanhoImagem}`);
            
            // Substituir qualquer ocorrência
            formHtml = formHtml.replace(/value="{{tamanhoImagem}}"/g, `value="${tamanhoImagem}"`);
            formHtml = formHtml.replace(/>{{tamanhoImagem}}%</g, `>${tamanhoImagem}%<`);
        }
        
        document.getElementById('modalBody').innerHTML = formHtml;
        document.getElementById('modalEdicao').classList.add('active');
        
        // Inicializar controles específicos
        setTimeout(() => {
            this.inicializarSummernote();
            this.inicializarControlesEspecificos();
        }, 100);
    }

    inicializarControlesEspecificos() {
        // Inicializar slider para texto+img
        const tamanhoSlider = document.getElementById('editTamanhoImagem');
        const tamanhoValue = document.getElementById('tamanhoImagemValue');
        
        if (tamanhoSlider && tamanhoValue) {
            tamanhoValue.textContent = tamanhoSlider.value + '%';
            tamanhoSlider.addEventListener('input', (e) => {
                tamanhoValue.textContent = e.target.value + '%';
            });
        }
        
        // Inicializar slider para img
        const larguraSlider = document.getElementById('editLargura');
        const larguraValue = document.getElementById('larguraValue');
        
        if (larguraSlider && larguraValue) {
            larguraValue.textContent = larguraSlider.value + '%';
            larguraSlider.addEventListener('input', (e) => {
                larguraValue.textContent = e.target.value + '%';
            });
        }
    }

    // Função preencherSelectsNoFormulario - ATUALIZADA
    preencherSelectsNoFormulario(formHtml) {
        if (!this.componenteEditando) return formHtml;
        
        const config = this.componenteEditando.config;
        
        console.log('Preenchendo formulário com config:', config);
        
        // CONVERSÃO: Se existir imagemUrl antiga, converter para imagemNome
        if (config.imagemUrl && !config.imagemNome) {
            const nomeArquivo = window.extrairNomeArquivo(config.imagemUrl);
            config.imagemNome = nomeArquivo;
            console.log(`Convertendo imagemUrl para imagemNome: ${nomeArquivo}`);
        }
        
        // Para cada select, verificar se precisa marcar como selected
        const selectKeys = ['alinhamentoLinhas', 'alinhamentoTexto', 'posicao', 'alturaBanner', 'alinhamento', 'estiloFonte', 'direcaoGradiente', 'direcaoOverlayGradiente', 'modoBlend'];
        
        selectKeys.forEach(key => {
            if (config[key]) {
                // Primeiro: substituir <option value="valor"> por <option value="valor" selected>
                const selectRegex = new RegExp(`<option value="${config[key]}">`, 'g');
                formHtml = formHtml.replace(selectRegex, `<option value="${config[key]}" selected>`);
                
                // Segundo: também substituir padrões de template {{key == 'value' ? 'selected' : ''}}
                const conditionalRegex = new RegExp(`{{${key}\\s*==\\s*'${config[key]}'\\s*\\?\\s*'selected'\\s*:\\s*''}}`, 'g');
                formHtml = formHtml.replace(conditionalRegex, 'selected');
                
                console.log(`Select ${key} definido como: ${config[key]}`);
            }
        });
        
        // Preencher o valor do range (tamanhoImagem) - IMPORTANTE!
        if (config.tamanhoImagem) {
            console.log(`Configurando tamanhoImagem: ${config.tamanhoImagem}`);
            
            // Substituir o valor do input range
            const rangeRegex = /value="{{tamanhoImagem}}"/g;
            formHtml = formHtml.replace(rangeRegex, `value="${config.tamanhoImagem}"`);
            
            // Também substituir usando outro padrão
            const rangeRegex2 = /id="editTamanhoImagem"[^>]*value="[^"]*"/g;
            formHtml = formHtml.replace(rangeRegex2, `id="editTamanhoImagem" min="20" max="80" value="${config.tamanhoImagem}"`);
            
            // Atualizar também o texto exibido
            const spanRegex = /id="tamanhoImagemValue"[^>]*>[^<]*<\/span>/g;
            formHtml = formHtml.replace(spanRegex, `id="tamanhoImagemValue">${config.tamanhoImagem}%</span>`);
            
            // Outro padrão possível
            const spanRegex2 = /{{tamanhoImagem}}%/g;
            formHtml = formHtml.replace(spanRegex2, `${config.tamanhoImagem}%`);
        }
        
        // Preencher checkboxes
        const checkboxKeys = ['animacaoAtiva', 'sombra', 'italicoLegenda', 'blurImagemFundo'];
        checkboxKeys.forEach(key => {
            if (config[key] !== undefined) {
                // Para checkboxes, substituir {{#if key}}checked{{/if}} ou {{key}}
                const isChecked = config[key] === true || config[key] === 'true';
                
                // Padrão 1: {{#if key}}checked{{/if}}
                const ifRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, 'g');
                formHtml = formHtml.replace(ifRegex, isChecked ? '$1' : '');
                
                // Padrão 2: {{key}} (substituir por 'checked' ou vazio)
                const simpleRegex = new RegExp(`{{${key}}}`, 'g');
                formHtml = formHtml.replace(simpleRegex, isChecked ? 'checked' : '');
                
                console.log(`Checkbox ${key} definido como: ${isChecked}`);
            }
        });
        
        // Preencher outros campos que possam ter valores padrão
        const camposComValoresPadrao = {
            'gap': '32px',
            'bordaImagem': '8px',
            'margem': '0 0 48px 0',
            'paddingTop': '0',
            'paddingBottom': '32px',
            'espacamentoLegenda': '12px',
            'tamanhoLegenda': '0.9rem',
            'corLegenda': '#64748b',
            'opacidadeImagemFundo': '40',
            'opacidadeOverlay1': '80',
            'opacidadeOverlay2': '80'
        };
        
        Object.keys(camposComValoresPadrao).forEach(key => {
            if (!config[key] || config[key] === '') {
                const valueRegex = new RegExp(`value="{{${key}}}"`, 'g');
                formHtml = formHtml.replace(valueRegex, `value="${camposComValoresPadrao[key]}"`);
            }
        });
        
        return formHtml;
    }

    // Nova função: processarCondicionaisFormulario
    processarCondicionaisFormulario(formHtml) {
        if (!this.componenteEditando) return formHtml;
        
        const config = this.componenteEditando.config;
        
        // Processar condições {{#ifeq key "value"}}...{{/ifeq}}
        const ifeqRegex = /{{#ifeq\s+(\w+)\s+"([^"]+)"}}([\s\S]*?){{\/ifeq}}/g;
        formHtml = formHtml.replace(ifeqRegex, (match, key, value, content) => {
            return config[key] === value ? content : '';
        });
        
        // Processar condições {{#if key}}...{{/if}}
        const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
        formHtml = formHtml.replace(ifRegex, (match, key, content) => {
            const value = config[key];
            const isTruthy = value === true || value === 'true' || (value && value !== 'false');
            return isTruthy ? content : '';
        });
        
        return formHtml;
    }

    getKeyFromInputId(id) {
        if (!id || !id.startsWith('edit')) return null;
        
        // Converter "editNomeCampo" para "nomeCampo"
        let key = id.replace('edit', '');
        
        // Converter primeira letra para minúscula
        key = key.charAt(0).toLowerCase() + key.slice(1);
        
        // Casos especiais - MAPEAMENTO COMPLETO
        const specialCases = {
            'imagemNome': 'imagemNome',
            'imagemUrl': 'imagemNome', // Mantém compatibilidade com URLs antigas
            'imagemAlt': 'imagemAlt',
            'corLegenda': 'corLegenda',
            'tamanhoImagem': 'tamanhoImagem',
            'bordaImagem': 'bordaImagem',
            'alinhamentoTexto': 'alinhamentoTexto',
            'alinhamentoLinhas': 'alinhamentoLinhas',
            'espacamentoLinhas': 'espacamentoLinhas',
            'espacamentoParagrafos': 'espacamentoParagrafos',
            'paddingTop': 'paddingTop',
            'paddingBottom': 'paddingBottom',
            'textoBotao': 'textoBotao',
            'espacamentoLegenda': 'espacamentoLegenda',
            'tamanhoLegenda': 'tamanhoLegenda',
            'italicoLegenda': 'italicoLegenda',
            'titulo': 'titulo',
            'subtitulo': 'subtitulo',
            'alturaBanner': 'alturaBanner',
            'animacaoAtiva': 'animacaoAtiva',
            'conteudo': 'conteudo',
            'corTexto': 'corTexto',
            'margem': 'margem',
            'url': 'url',
            'alt': 'alt',
            'legenda': 'legenda',
            'largura': 'largura',
            'sombra': 'sombra',
            'alinhamento': 'alinhamento',
            'texto': 'texto',
            'tags': 'tags',
            'itens': 'itens',
            'posicao': 'posicao',
            'gap': 'gap',
            'corFundo': 'corFundo',
            'corFundo2': 'corFundo2',
            'direcaoGradiente': 'direcaoGradiente',
            'estiloFonte': 'estiloFonte',
            'corLinha': 'corLinha',
            'espessuraLinha': 'espessuraLinha',
            'corTitulo': 'corTitulo',
            'tamanhoTitulo': 'tamanhoTitulo',
            'tamanhoTexto': 'tamanhoTexto',
            'corBotao': 'corBotao',
            'corTextoBotao': 'corTextoBotao',
            'corBordaBotao': 'corBordaBotao',
            'espessuraBordaBotao': 'espessuraBordaBotao',
            'bordaBotao': 'bordaBotao',
            'paddingBotaoVertical': 'paddingBotaoVertical',
            'paddingBotaoHorizontal': 'paddingBotaoHorizontal',
            'imagemFundoNome': 'imagemFundoNome',
            'imagemFundoUrl': 'imagemFundoNome', // Compatibilidade
            'tamanhoImagemFundo': 'tamanhoImagemFundo',
            'posicaoImagemFundo': 'posicaoImagemFundo',
            'repetirImagemFundo': 'repetirImagemFundo',
            'opacidadeImagemFundo': 'opacidadeImagemFundo',
            'animacaoImagem': 'animacaoImagem',
            'blurImagemFundo': 'blurImagemFundo',
            'intensidadeBlurImagem': 'intensidadeBlurImagem',
            'corOverlay': 'corOverlay',
            'opacidadeOverlay': 'opacidadeOverlay',
            'modoBlend': 'modoBlend',
            'corOverlay1': 'corOverlay1',
            'corOverlay2': 'corOverlay2',
            'opacidadeOverlay1': 'opacidadeOverlay1',
            'opacidadeOverlay2': 'opacidadeOverlay2',
            'direcaoOverlayGradiente': 'direcaoOverlayGradiente'
        };
        
        return specialCases[key] || key;
    }

    async waitForSummernote() {
        return new Promise((resolve) => {
            if (typeof $.fn.summernote !== 'undefined') {
                this.isSummernoteLoaded = true;
                resolve();
                return;
            }

            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof $.fn.summernote !== 'undefined') {
                    this.isSummernoteLoaded = true;
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts > 20) {
                    clearInterval(checkInterval);
                    console.warn('Summernote não carregou após 10 segundos');
                    resolve();
                }
            }, 500);
        });
    }

    inicializarSummernote() {
        // Destruir instâncias anteriores
        this.destruirSummernote();
        
        // Verificar se Summernote está disponível
        if (typeof $.fn.summernote === 'undefined') {
            console.warn('Summernote não está disponível');
            return;
        }
        
        // Configuração do Summernote com fontes específicas
        const config = {
                height: 300,
                lang: 'pt-BR',
                toolbar: [
                    ['style', ['style']],
                    ['font', ['bold', 'italic', 'underline', 'clear']],
                    ['fontsize', ['fontsize']],
                    ['color', ['color']],
                    ['para', ['ul', 'ol', 'paragraph']],
                    ['table', ['table']],
                    ['insert', ['link', 'picture', 'video']],
                    ['view', ['fullscreen', 'codeview', 'help']]
                ],
                styleTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                fontNames: ['Tahoma', 'Arial', 'Montserrat', 'Merriweather', 'Verdana', 'Georgia'],
                disableDragAndDrop: true,
                shortcuts: false,
                dialogsInBody: true,
                content_style: `
                    body { 
                        font-family: Tahoma, Arial, sans-serif; 
                        font-size: 12px; 
                        line-height: 1.15;
                    }
                    p { 
                        margin-bottom: 1.5em;
                    }
                    h1, h2, h3, h4, h5, h6 {
                        font-family: 'Montserrat', sans-serif;
                        font-weight: 900 !important;
                    }
                    h1 { font-size: 2.5em; }
                    h2 { font-size: 2em; }
                    h3 { font-size: 1.75em; }
                    h4 { font-size: 1.5em; }
                    h5 { font-size: 1.25em; }
                    h6 { font-size: 1em; }
                `
            };
        
        try {
            $('textarea.summernote-editor').summernote(config);
            console.log('Summernote inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar Summernote:', error);
        }
    }

    destruirSummernote() {
        if (typeof $.fn.summernote === 'undefined') return;
        
        try {
            $('textarea.summernote-editor').summernote('destroy');
        } catch (error) {
            console.error('Erro ao destruir Summernote:', error);
        }
    }

    // Função salvarComponente - ATUALIZADA (para garantir que checkboxes sejam salvos)
    salvarComponente() {
        if (!this.componenteEditando) return;
        
        console.log('=== Salvando componente ===');
        console.log('Tipo do componente:', this.componenteEditando.tipo);
        
        // Salvar conteúdo do Summernote primeiro
        if (typeof $.fn.summernote !== 'undefined') {
            $('textarea.summernote-editor').each(function() {
                const content = $(this).summernote('code');
                $(this).val(content);
                console.log('Conteúdo Summernote salvo:', content.substring(0, 50) + '...');
            });
        }

        const form = document.getElementById('modalBody');
        const inputs = form.querySelectorAll('input, select, textarea');
        
        // Resetar configuração do componente
        this.componenteEditando.config = {};
        
        console.log('Campos encontrados no formulário:');
        inputs.forEach(input => {
            const key = this.getKeyFromInputId(input.id);
            if (!key) return;
            
            let value;
            
            if (input.type === 'checkbox') {
                value = input.checked;
                this.componenteEditando.config[key] = value;
                console.log(`  ${key} (checkbox): ${value}`);
            } else if (input.type === 'number') {
                value = parseFloat(input.value) || 0;
                this.componenteEditando.config[key] = value;
                console.log(`  ${key} (number): ${value}`);
            } else if (input.type === 'range') {
                // IMPORTANTE: Salvar o valor do range como número
                value = parseFloat(input.value) || 50;
                this.componenteEditando.config[key] = value;
                console.log(`  ${key} (range): ${value} ← SALVO`);
            } else if (input.type === 'color') {
                value = input.value || '';
                this.componenteEditando.config[key] = value;
                console.log(`  ${key} (color): ${value}`);
            } else if (input.tagName === 'SELECT') {
                value = input.value || '';
                this.componenteEditando.config[key] = value;
                console.log(`  ${key} (select): ${value}`);
            } else if (input.tagName === 'TEXTAREA' && !input.classList.contains('summernote-editor')) {
                value = input.value || '';
                this.componenteEditando.config[key] = value;
                console.log(`  ${key} (textarea): ${value.substring(0, 50)}...`);
            } else {
                value = input.value || '';
                this.componenteEditando.config[key] = value;
                console.log(`  ${key} (text): ${value}`);
            }
        });

        // Processamento especial para sumário-flutuante
        if (this.componenteEditando.tipo === 'sumario-flutuante') {
            const textarea = document.getElementById('editItens');
            if (textarea) {
                const lines = textarea.value.split('\n').filter(line => line.trim());
                const itens = lines.map(line => {
                    const parts = line.split('|');
                    return {
                        id: parts[0]?.trim() || '',
                        texto: parts[1]?.trim() || ''
                    };
                });
                this.componenteEditando.config.itens = itens;
                console.log('Itens do sumário processados:', itens);
            }
        }
        
        // Processamento especial para hashtags
        if (this.componenteEditando.tipo === 'hashtags') {
            const input = document.getElementById('editTags');
            if (input) {
                const tags = input.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                this.componenteEditando.config.tags = tags;
                console.log('Tags processadas:', tags);
            }
        }

        // Debug: verificar o valor salvo
        console.log('Configuração completa salva:', this.componenteEditando.config);
        
        this.renderizarTodos();
        this.fecharModal();
    }

    removerComponente(id) {
        if (!confirm('Tem certeza que deseja remover este componente?')) return;
        
        this.componentes = this.componentes.filter(c => c.id !== id);
        const elemento = document.querySelector(`[data-id="${id}"]`);
        if (elemento) elemento.remove();
        
        // Remover CSS específico
        const style = document.getElementById(`style-${id}`);
        if (style) style.remove();
        
        console.log(`Componente ${id} removido`);
    }

    moverComponente(id, direcao) {
        const index = this.componentes.findIndex(c => c.id === id);
        
        if (direcao === 'up' && index > 0) {
            [this.componentes[index], this.componentes[index - 1]] = [this.componentes[index - 1], this.componentes[index]];
        } else if (direcao === 'down' && index < this.componentes.length - 1) {
            [this.componentes[index], this.componentes[index + 1]] = [this.componentes[index + 1], this.componentes[index]];
        }
        
        this.renderizarTodos();
    }

    renderizarTodos() {
        const container = document.getElementById('componentesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        this.componentes.forEach(comp => this.renderizarComponente(comp));
    }

    fecharModal() {
        this.destruirSummernote();
        document.getElementById('modalEdicao').classList.remove('active');
        this.componenteEditando = null;
    }

    setupEventListeners() {
        // Botões de ação principal
        document.getElementById('btnSalvar')?.addEventListener('click', () => this.gerarArtigo());
        document.getElementById('btnPreview')?.addEventListener('click', () => this.visualizarArtigo());
        document.getElementById('btnLimpar')?.addEventListener('click', () => this.limparTudo());
        
        // NOVO: Botão para carregar artigo
        document.getElementById('btnCarregar')?.addEventListener('click', () => this.carregarArtigo());

        // Modal
        document.querySelector('.close-modal')?.addEventListener('click', () => this.fecharModal());
        document.getElementById('btnCancelar')?.addEventListener('click', () => this.fecharModal());
        document.getElementById('btnSalvarModal')?.addEventListener('click', () => this.salvarComponente());

        // Fechar modal ao clicar fora
        document.getElementById('modalEdicao')?.addEventListener('click', (e) => {
            if (e.target.id === 'modalEdicao') {
                this.fecharModal();
            }
        });
    }

    limparTudo() {
        if (!confirm('Tem certeza que deseja limpar todos os componentes?')) return;
        
        this.componentes = [];
        const container = document.getElementById('componentesContainer');
        if (container) container.innerHTML = '';
        
        // Mostrar placeholder
        const placeholder = document.getElementById('bannerPlaceholder');
        if (placeholder) placeholder.style.display = 'block';
        
        // Remover todos os estilos de componentes
        document.querySelectorAll('style[id^="style-"]').forEach(style => style.remove());
        
        console.log('Todos os componentes foram removidos');
    }

    visualizarArtigo() {
        const conteudo = this.gerarHTMLArtigoCompleto();
        const preview = window.open();
        
        if (!preview) {
            alert('Por favor, permita pop-ups para visualizar o artigo');
            return;
        }
        
        preview.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview do Artigo</title>
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@900;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body { margin: 0; padding: 0; font-family: Tahoma, Arial, sans-serif; background: #f8fafc; }
                </style>
            </head>
            <body>
                ${conteudo}
            </body>
            </html>
        `);
    }

    carregarArtigo() {
        // Criar input de arquivo
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.json';
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const content = await this.lerArquivo(file);
                this.processarArquivoCarregado(content, file.name);
            } catch (error) {
                console.error('Erro ao carregar artigo:', error);
                alert('Erro ao carregar o artigo. Verifique se é um arquivo válido gerado por este editor.');
            }
            
            // Limpar input para permitir carregar o mesmo arquivo novamente
            input.value = '';
        });
        
        document.body.appendChild(input);
        input.click();
    }

    lerArquivo(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    processarArquivoCarregado(conteudo, nomeArquivo) {
        // Tentar extrair dados do artigo
        const dados = this.extrairDadosArtigo(conteudo);
        
        if (dados && dados.componentes) {
            // Limpar componentes atuais
            this.limparTudo();
            
            // Carregar componentes
            this.componentes = dados.componentes;
            
            // Atualizar nome do arquivo
            const nomeArquivoInput = document.getElementById('nomeArquivo');
            if (nomeArquivoInput) {
                // Remover extensão .html se existir
                const nomeBase = nomeArquivo.replace(/\.html$/i, '').replace(/\.json$/i, '');
                nomeArquivoInput.value = nomeBase;
            }
            
            // Renderizar todos os componentes
            this.renderizarTodos();
            
            alert('Artigo carregado com sucesso! Você pode editar os componentes e gerar um novo artigo.');
        } else {
            // Tentar parsear como JSON puro
            try {
                const dadosJson = JSON.parse(conteudo);
                if (dadosJson.componentes) {
                    this.processarDadosJSON(dadosJson, nomeArquivo);
                    return;
                }
            } catch (e) {
                // Não é JSON válido
            }
            
            alert('Não foi possível carregar o artigo. O arquivo não contém dados válidos do editor.');
        }
    }

    extrairDadosArtigo(html) {
        try {
            // Tenta encontrar dados no formato gerado pelo editor
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Procurar por script com dados
            const scripts = doc.querySelectorAll('script');
            for (const script of scripts) {
                if (script.textContent.includes('articleData') || 
                    script.textContent.includes('componentes')) {
                    try {
                        // Extrair objeto JSON do script
                        const scriptContent = script.textContent;
                        
                        // Encontrar o objeto JSON
                        const jsonMatch = scriptContent.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const jsonStr = jsonMatch[0];
                            const dados = JSON.parse(jsonStr);
                            if (dados.componentes) {
                                return dados;
                            }
                        }
                    } catch (e) {
                        console.warn('Não foi possível extrair dados do script:', e);
                    }
                }
            }
            
            // Tentar extrair da estrutura do artigo gerado
            return this.reconstruirDadosDoHTML(doc);
        } catch (error) {
            console.error('Erro ao extrair dados do artigo:', error);
            return null;
        }
    }

    reconstruirDadosDoHTML(doc) {
        // Esta é uma implementação básica que tenta reconstruir os dados
        // a partir do HTML gerado.
        
        const componentes = [];
        const elementos = doc.querySelectorAll('.article-container > *');
        
        elementos.forEach((elemento, index) => {
            // Identificar o tipo de componente pela classe
            let tipo = 'text';
            
            if (elemento.classList.contains('article-banner')) {
                tipo = 'banner';
            } else if (elemento.classList.contains('text-img-component')) {
                tipo = 'text+img';
            } else if (elemento.classList.contains('image-component') || 
                       elemento.tagName.toLowerCase() === 'img') {
                tipo = 'img';
            } else if (elemento.classList.contains('blockquote-component')) {
                tipo = 'blockquote';
            } else if (elemento.classList.contains('cta-component')) {
                tipo = 'cta';
            } else if (elemento.classList.contains('hashtags-component')) {
                tipo = 'hashtags';
            }
            
            componentes.push({
                id: Date.now() + index,
                tipo: tipo,
                config: {
                    // Configurações básicas podem ser extraídas aqui
                    // Para uma implementação completa, seria necessário
                    // salvar os dados no arquivo gerado
                }
            });
        });
        
        return { componentes: componentes };
    }

    processarDadosJSON(dadosJson, nomeArquivo) {
        // Limpar componentes atuais
        this.limparTudo();
        
        // Carregar componentes
        this.componentes = dadosJson.componentes;
        
        // Atualizar nome do arquivo
        const nomeArquivoInput = document.getElementById('nomeArquivo');
        if (nomeArquivoInput) {
            nomeArquivoInput.value = nomeArquivo.replace(/\.json$/i, '');
        }
        
        // Renderizar todos os componentes
        this.renderizarTodos();
        
        alert('Artigo carregado com sucesso a partir do JSON!');
    }

    gerarArtigo() {
        const nomeArquivo = document.getElementById('nomeArquivo')?.value || 'artigo';
        const conteudo = this.gerarHTMLArtigoCompleto();
        
        // Para salvar como arquivo, precisamos da estrutura completa
        const htmlCompleto = `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${nomeArquivo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body>
        ${conteudo}
    </body>
    </html>`;
        
        const blob = new Blob([htmlCompleto], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomeArquivo}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Artigo "${nomeArquivo}.html" gerado com sucesso!\n\nO arquivo foi baixado para seu computador.`);
    }

    // FUNÇÃO ADICIONADA: Aplicar ID ao banner para referência do sumário
    aplicarIdAoBanner(elemento, bannerId) {
        if (!elemento || !bannerId) return elemento;
        
        // Encontrar o título h1 dentro do banner e aplicar o ID
        const h1 = elemento.querySelector('h1');
        if (h1) {
            h1.id = bannerId;
            console.log('ID aplicado ao título do banner:', bannerId);
        }
        
        return elemento;
    }

    gerarHTMLArtigoCompleto() {
        let conteudoHTML = '';
        let articleCSS = '';
        let hasBanner = false;
        let hasSumario = false;
        let tituloBanner = null;
        let bannerId = null;
        
        // Primeiro, coletar todos os CSS dos componentes e verificar se há banner/sumário
        this.componentes.forEach(comp => {
            const componenteData = this.componentesDisponiveis[comp.tipo];
            if (componenteData && componenteData.css) {
                articleCSS += componenteData.css + '\n';
            }
            
            if (comp.tipo === 'banner') {
                hasBanner = true;
                tituloBanner = comp.config.titulo || 'Título do Artigo';
                bannerId = `titulo-banner-${comp.id}`;
            }
            
            if (comp.tipo === 'sumario-flutuante') {
                hasSumario = true;
            }
        });
        
        // Adicionar CSS da animação do banner se houver banner
        if (hasBanner) {
            articleCSS += `
                @keyframes bannerPan {
                    0%   { transform: translateX(0); }
                    50%  { transform: translateX(8%); }
                    100% { transform: translateX(0); }
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .banner-image {
                        animation: none !important;
                    }
                }
            `;
        }
        
        // Coletar conteúdo HTML dos componentes (exceto sumário - ele será adicionado separadamente)
        let mainContent = '';
        let titulosParaSumario = [];
        
        // Adicionar o título do banner como PRIMEIRO item do sumário
        if (hasBanner && tituloBanner) {
            titulosParaSumario.push({
                id: bannerId,
                texto: tituloBanner,
                nivel: 1,
                tag: 'h1',
                isBanner: true
            });
        }
        
        this.componentes.forEach(comp => {
            // Pular sumário - ele será adicionado como elemento fixo separado
            if (comp.tipo === 'sumario-flutuante') return;
            
            let elemento;
            
            // Tentar usar a função de criação do componente
            const componenteData = this.componentesDisponiveis[comp.tipo];
            if (componenteData && componenteData.js) {
                try {
                    // Criar elemento usando a função do componente
                    // Passa isEditor=false para artigo final (usa caminhos relativos)
                    const criarElementoFn = new Function('config', 'id', 'isEditor', componenteData.js + '\nreturn criarElemento(config, id, isEditor);');
                    elemento = criarElementoFn(comp.config, comp.id, false);
                } catch (error) {
                    console.error(`Erro ao criar elemento do componente ${comp.tipo}:`, error);
                    elemento = this.criarElementoFromTemplate(comp, false);
                    if (!elemento) {
                        elemento = this.criarElementoGenerico(comp);
                    }
                }
            } else {
                elemento = this.criarElementoFromTemplate(comp, false);
                if (!elemento) {
                    elemento = this.criarElementoGenerico(comp);
                }
            }
            
            if (elemento) {
                // Aplicar ID ao banner para referência do sumário
                if (comp.tipo === 'banner' && bannerId) {
                    elemento = this.aplicarIdAoBanner(elemento, bannerId);
                }
                
                // Aplicar padding para componentes não-banner
                if (comp.tipo !== 'banner') {
                    elemento.style.paddingTop = comp.config.paddingTop || '0';
                    elemento.style.paddingBottom = comp.config.paddingBottom || '32px';
                    elemento.style.maxWidth = '900px';
                    elemento.style.marginLeft = 'auto';
                    elemento.style.marginRight = 'auto';
                    elemento.style.width = '100%';
                    elemento.style.boxSizing = 'border-box';
                }
                
                // Extrair títulos para o sumário (exceto do banner que já adicionamos)
                // E adicionar IDs aos títulos que não têm
                if (comp.tipo === 'text' || comp.tipo === 'text+img') {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = elemento.outerHTML;
                    
                    // Encontrar todos os H1, H2, H3, H4, H5, H6 e atribuir IDs únicos
                    const titulos = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    titulos.forEach((titulo, index) => {
                        // Criar ID único se não existir
                        if (!titulo.id || titulo.id === '') {
                            titulo.id = `titulo-auto-${Date.now()}-${comp.id}-${index}`;
                        }
                        
                        // Coletar informações do título
                        titulosParaSumario.push({
                            id: titulo.id,
                            texto: titulo.textContent || titulo.innerText,
                            nivel: parseInt(titulo.tagName.charAt(1)),
                            tag: titulo.tagName.toLowerCase()
                        });
                    });
                    
                    // Atualizar o elemento com os IDs
                    elemento = tempDiv.firstElementChild || tempDiv;
                }
                
                mainContent += elemento.outerHTML + '\n';
            }
        });
        
        // Gerar sumário automático se houver componente de sumário
        let sumarioHTML = '';
        if (hasSumario && titulosParaSumario.length > 0) {
            sumarioHTML = this.gerarSumarioAutomatico(titulosParaSumario);
        }
        
        // Dados do artigo para possível recarregamento
        const dadosArtigo = `
        <script type="application/json" id="article-data">
        {
            "componentes": ${JSON.stringify(this.componentes, null, 2)},
            "geradoEm": "${new Date().toISOString()}",
            "versaoEditor": "1.0"
        }
        </script>`;
        
        // AGORA: Gerar apenas o conteúdo que será injetado no app shell
        return `
    <div class="article-container" style="max-width: 100%; margin: 0 auto; padding: 0; width: 100%; box-sizing: border-box;">
        <style>
            /* Estilos base do artigo */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            /* Estilos de largura máxima para componentes não-banner */
            .text-component,
            .text-img-component,
            .image-component,
            .cta-component,
            .blockquote-component,
            .hashtags-component {
                max-width: 900px !important;
                margin-left: auto !important;
                margin-right: auto !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Responsividade para telas menores que 900px */
            @media (max-width: 900px) {
                .text-component,
                .text-img-component,
                .image-component,
                .cta-component,
                .blockquote-component,
                .hashtags-component {
                    max-width: calc(100% - 48px) !important;
                    margin-left: 24px !important;
                    margin-right: 24px !important;
                }
            }
            
            /* RESPONSIVIDADE CRÍTICA: Em telas menores que 600px, transformar colunas em linhas */
            @media (max-width: 600px) {
                .text-component,
                .text-img-component,
                .image-component,
                .cta-component,
                .blockquote-component,
                .hashtags-component {
                    max-width: calc(100% - 32px) !important;
                    margin-left: 16px !important;
                    margin-right: 16px !important;
                }
                
                /* Transformar colunas em linhas para texto+img */
                .text-img-component .grid-container {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 24px !important;
                }
                
                /* Forçar a ordem: imagem primeiro, texto depois */
                .text-img-component.posicao-esquerda .grid-container .image-column,
                .text-img-component.posicao-direita .grid-container .image-column {
                    order: 1 !important;
                }
                
                .text-img-component.posicao-direita .grid-container .text-column,
                .text-img-component.posicao-esquerda .grid-container .text-column {
                    order: 2 !important;
                }
                
                /* Garantir que as colunas ocupem 100% da largura */
                .text-img-component .image-column,
                .text-img-component .text-column {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                
                /* Remover grid template quando em mobile */
                .text-img-component .grid-container {
                    grid-template-columns: 1fr !important;
                    grid-template-areas: none !important;
                }
            }
            
            /* Estilos dos componentes */
            ${articleCSS}
            
            /* Estilos específicos para o banner */
            .article-banner {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                contain: paint;
                box-sizing: border-box !important;
            }
            
            /* Ajuste de padding superior para o banner no mobile */
            @media (max-width: 768px) {
                .banner-overlay {
                    padding-top: 64px !important; /* Acomoda o header do appshell */
                    align-items: flex-end !important;
                }
            }
            
            @media (max-width: 480px) {
                .banner-overlay {
                    padding-top: 64px !important; /* Acomoda o header do appshell */
                }
            }
            
            /* Responsividade */
            @media (max-width: 768px) {
                .article-banner {
                    height: clamp(180px, 22vh, 300px) !important;
                }
                
                .banner-overlay {
                    padding: 0 18px !important;
                    background: linear-gradient(to top,
                        rgba(0,0,0,.9),
                        rgba(0,0,0,.5) 25%,
                        transparent 50%) !important;
                    align-items: flex-end !important;
                    padding-top: 64px !important;
                }
                
                .banner-content {
                    padding-bottom: 24px !important;
                    gap: 6px !important;
                    margin-bottom: 0 !important;
                }
                
                .banner-overlay h1 {
                    font-size: clamp(1.2rem, 5.5vw, 1.8rem) !important;
                    letter-spacing: .06em !important;
                    line-height: 1.15 !important;
                }
                
                .banner-overlay p {
                    font-size: 0.85rem !important;
                    opacity: 0.95 !important;
                    line-height: 1.3 !important;
                }
                
                .grid-container {
                    grid-template-columns: 1fr !important;
                    gap: 20px !important;
                }
            }
            
            @media (max-width: 480px) {
                .article-banner {
                    height: clamp(160px, 20vh, 260px) !important;
                }
                
                .banner-overlay {
                    padding: 0 16px !important;
                    background: linear-gradient(to top,
                        rgba(0,0,0,.92),
                        rgba(0,0,0,.6) 20%,
                        transparent 45%) !important;
                    padding-top: 64px !important;
                }
                
                .banner-content {
                    padding-bottom: 20px !important;
                    gap: 4px !important;
                }
                
                .banner-overlay h1 {
                    font-size: clamp(1rem, 6vw, 1.5rem) !important;
                    letter-spacing: .05em !important;
                    line-height: 1.1 !important;
                }
                
                .banner-overlay p {
                    font-size: 0.8rem !important;
                    line-height: 1.25 !important;
                }
            }
        </style>
        
        ${mainContent || '<p>Nenhum conteúdo adicionado ao artigo.</p>'}
        
        ${sumarioHTML}
        
        ${dadosArtigo}
    </div>`;
    }

    gerarSumarioAutomatico(titulos) {
        if (!titulos || titulos.length === 0) return '';
        
        let sumarioHTML = `
        <div class="sumario-flutuante-gerado" style="
            position: fixed;
            top: 34%;
            left: max(10px, calc(0% - 0px));
            width: 300px;
            max-width: 34ch;
            background: #f8fafc;
            border-left: 4px solid #2563eb;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            overflow-y: auto;
            max-height: 70vh;
            box-sizing: border-box;
            display: none;
        ">
            <h4 style="
                font-family: 'Montserrat', sans-serif;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                margin-bottom: 16px;
                color: #020617;
                font-size: 0.9rem;
            ">
                Sumário
            </h4>
            <ul style="
                list-style: none;
                padding-left: 0;
                margin: 0;
            ">`;
        
        titulos.forEach((titulo, index) => {
            let margem = 0;
            if (titulo.nivel === 2) margem = 15;
            else if (titulo.nivel === 3) margem = 30;
            else if (titulo.nivel === 4) margem = 45;
            else if (titulo.nivel === 5) margem = 60;
            else if (titulo.nivel === 6) margem = 75;
            
            const isBannerTitle = titulo.isBanner || index === 0;
            const fontWeight = isBannerTitle ? '600' : 'normal';
            const fontSize = isBannerTitle ? '0.95rem' : '0.85rem';
            
            const texto = titulo.texto;
            const palavras = texto.split(' ');
            let linhas = [];
            let linhaAtual = '';
            
            palavras.forEach(palavra => {
                if (linhaAtual.length + palavra.length + 1 <= 34) {
                    if (linhaAtual) linhaAtual += ' ';
                    linhaAtual += palavra;
                } else {
                    if (linhaAtual) linhas.push(linhaAtual);
                    linhaAtual = palavra;
                }
            });
            
            if (linhaAtual) linhas.push(linhaAtual);
            
            const textoFormatado = linhas.join('<br>');
            
            sumarioHTML += `
                <li style="
                    margin-bottom: 12px;
                    word-wrap: break-word;
                    max-width: 34ch;
                    margin-left: ${margem}px;
                ">
                    <a href="#${titulo.id}" 
                    style="
                            color: #2563eb;
                            text-decoration: none;
                            font-family: Tahoma, Arial, sans-serif;
                            font-size: ${fontSize};
                            font-weight: ${fontWeight};
                            line-height: 1.4;
                            display: block;
                            transition: color 0.3s;
                            cursor: pointer;
                    "
                    class="sumario-link"
                    data-target="${titulo.id}">
                        ${textoFormatado}
                    </a>
                </li>
            `;
        });
        
        sumarioHTML += `
            </ul>
        </div>
        
        <script>
            (function() {
                console.log('Script do sumário sendo inicializado...');
                
                // Função para scroll suave com padding
                function scrollToElementWithPadding(elementId, paddingTop = 100) {
                    const element = document.getElementById(elementId);
                    if (!element) {
                        console.warn('Elemento não encontrado:', elementId);
                        return;
                    }
                    
                    // Verificar se estamos dentro do app shell
                    const isInAppShell = document.querySelector('header[class*="gradient-animated"]') !== null;
                    
                    let finalPadding = paddingTop;
                    
                    // Se estiver no app shell, adicionar altura do header
                    if (isInAppShell) {
                        const header = document.querySelector('header[class*="gradient-animated"]');
                        const headerHeight = header ? header.offsetHeight : 64;
                        console.log('Detectado app shell, header height:', headerHeight);
                        finalPadding = paddingTop + headerHeight;
                    }
                    
                    console.log('Scrolling to element', elementId, 'with padding:', finalPadding);
                    
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - finalPadding;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Destacar elemento temporariamente
                    const originalOutline = element.style.outline;
                    element.style.outline = '2px solid #2563eb';
                    element.style.outlineOffset = '5px';
                    element.style.transition = 'outline 0.3s ease';
                    
                    setTimeout(() => {
                        element.style.outline = originalOutline;
                        element.style.outlineOffset = '';
                    }, 1500);
                }
                
                // Função para inicializar o sumário
                function initSumario() {
                    console.log('Inicializando sumário...');
                    
                    const sumarioEl = document.querySelector('.sumario-flutuante-gerado');
                    if (!sumarioEl) {
                        console.log('Sumário não encontrado');
                        return;
                    }
                    
                    // Verificar se há espaço para mostrar o sumário
                    function checkSumarioVisibility() {
                        const windowWidth = window.innerWidth;
                        const containerWidth = 900;
                        const sumarioWidth = 300;
                        const margins = 100;
                        
                        const requiredWidth = containerWidth + sumarioWidth + margins;
                        
                        if (windowWidth >= requiredWidth) {
                            sumarioEl.style.display = 'block';
                            console.log('Sumário visível - largura adequada');
                            return true;
                        } else {
                            sumarioEl.style.display = 'none';
                            console.log('Sumário oculto - largura insuficiente');
                            return false;
                        }
                    }
                    
                    // Inicializar visibilidade
                    checkSumarioVisibility();
                    window.addEventListener('resize', checkSumarioVisibility);
                    
                    // Adicionar event listeners aos links do sumário
                    const sumarioLinks = sumarioEl.querySelectorAll('.sumario-link');
                    sumarioLinks.forEach(link => {
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                            const targetId = this.getAttribute('href').substring(1);
                            
                            // Scroll suave com padding
                            scrollToElementWithPadding(targetId, 100);
                        });
                    });
                    
                    console.log('Sumário inicializado com', sumarioLinks.length, 'links');
                }
                
                // Inicializar quando o DOM estiver pronto
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initSumario);
                } else {
                    setTimeout(initSumario, 100);
                }
            })();
        </script>
        
        <style>
            /* Ocultar sumário quando não houver espaço */
            @media (max-width: 1500px) {
                .sumario-flutuante-gerado {
                    display: none !important;
                }
            }
            
            /* Também ocultar em mobile */
            @media (max-width: 1024px) {
                .sumario-flutuante-gerado {
                    display: none !important;
                }
            }
            
            /* Estilo para links do sumário */
            .sumario-link:hover {
                text-decoration: underline !important;
                color: #1d4ed8 !important;
            }
            
            /* Adicionar transição suave para posicionamento do sumário */
            .sumario-flutuante-gerado {
                transition: top 0.3s ease;
            }
        </style>`;
        
        return sumarioHTML;
    }
}

// Inicializar editor quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando editor...');
    
    // Verificar se jQuery está carregado
    if (typeof $ === 'undefined') {
        console.error('jQuery não está carregado! O Summernote não funcionará.');
        alert('Erro: jQuery não foi carregado. Recarregue a página.');
        return;
    }
    
    window.editor = new EditorBlog();
    
    // Expor editor globalmente para debugging
    window.debugEditor = () => {
        console.log('=== DEBUG EDITOR ===');
        console.log('Componentes disponíveis:', Object.keys(window.editor.componentesDisponiveis));
        console.log('Componentes no artigo:', window.editor.componentes.length);
        console.log('Summernote carregado:', window.editor.isSummernoteLoaded);
    };
});