(function () {
    let _currentProduct = null;
    let _onChangedCb = null;

    const TEMPLATE = `
        <div class="modal-overlay" id="productDetailModal">
          <div class="modal product-detail-modal">
            <div class="modal-header">
              <div class="modal-header-icon">
                <i data-lucide="package-search"></i>
              </div>
              <div>
                <h2 class="modal-title">Detalle del Producto</h2>
                <p class="modal-subtitle">Datos de catalogo y precios visibles</p>
              </div>
              <button class="modal-close" type="button" id="btn-close-product-detail">
                <i data-lucide="x"></i>
              </button>
            </div>

            <div class="product-detail-body">
              <div class="product-detail-hero">
                <div class="product-detail-image">
                  <img id="detailProductImage" src="../../../assets/img/logo.jpg" alt="Producto" />
                </div>
                <div class="product-detail-main">
                  <div class="product-detail-title-row">
                    <h3 id="detailProductName">Producto</h3>
                    <span class="product-detail-status active" id="detailProductStatus">Activo</span>
                  </div>
                  <div class="product-detail-tags">
                    <span class="meta-tag line" id="detailProductLine">Linea</span>
                    <span class="meta-tag presentation" id="detailProductPresentation">Presentacion</span>
                    <span class="meta-tag flavor" id="detailProductFlavor">Sabor</span>
                  </div>
                </div>
              </div>

              <div class="product-detail-info-grid">
                <div class="product-detail-info">
                  <span class="price-label">Precio mayoreo</span>
                  <strong id="detailProductWholesale">N/D</strong>
                </div>
                <div class="product-detail-info">
                  <span class="price-label">Precio detalle</span>
                  <strong id="detailProductRetail">N/D</strong>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline danger" type="button" id="btn-delete-product">
                <i data-lucide="trash-2"></i>
                Eliminar
              </button>
              <button class="btn btn-outline" type="button" id="btn-close-product-detail-text">Cerrar</button>
              <button class="btn btn-primary" type="button" id="btn-edit-product">
                <i data-lucide="edit-2"></i>
                Editar
              </button>
            </div>
          </div>
        </div>`;

    function initProductDetailModal() {
        const placeholder = document.getElementById('product-detail-modal-placeholder');
        if (!placeholder) return;

        placeholder.innerHTML = TEMPLATE;
        _bindEvents();
    }

    function _bindEvents() {
        document.getElementById('btn-close-product-detail').addEventListener('click', closeProductDetailModal);
        document.getElementById('btn-close-product-detail-text').addEventListener('click', closeProductDetailModal);
        document.getElementById('btn-edit-product').addEventListener('click', _handleEdit);
        document.getElementById('btn-delete-product').addEventListener('click', _handleDelete);
        document.getElementById('productDetailModal').addEventListener('click', (event) => {
            if (event.target.id === 'productDetailModal') closeProductDetailModal();
        });
    }

    function openProductDetailModal(product, onChanged) {
        _currentProduct = product;
        _onChangedCb = onChanged || null;
        _render(product);
        document.getElementById('productDetailModal').classList.add('is-open');
        document.body.style.overflow = 'hidden';
        lucide.createIcons();
    }

    function closeProductDetailModal() {
        document.getElementById('productDetailModal')?.classList.remove('is-open');
        document.body.style.overflow = '';
        _currentProduct = null;
    }

    function _render(product) {
        document.getElementById('detailProductImage').src = ProductImage.resolveUrl(product.imageUrl);
        document.getElementById('detailProductName').textContent = product.productName || 'Producto';
        document.getElementById('detailProductStatus').textContent = product.isActive ? 'Activo' : 'Inactivo';
        document.getElementById('detailProductStatus').className = `product-detail-status ${product.isActive ? 'active' : 'inactive'}`;
        document.getElementById('detailProductLine').textContent = product.lineName || '-';
        document.getElementById('detailProductPresentation').textContent = product.presentationName || '-';
        document.getElementById('detailProductFlavor').textContent = product.flavorName || '-';
        document.getElementById('detailProductWholesale').textContent = _formatPrice(product.wholesalePrice);
        document.getElementById('detailProductRetail').textContent = _formatPrice(product.retailPrice);
    }

    function _handleEdit() {
        if (!_currentProduct) return;

        const id = _currentProduct.id;
        closeProductDetailModal();
        openProductEditModal(id, _onChangedCb);
    }

    async function _handleDelete() {
        if (!_currentProduct) return;
        if (!confirm(`Seguro que queres eliminar "${_currentProduct.productName}"?`)) return;

        try {
            await ProductCatalogService.remove(_currentProduct.id);
            closeProductDetailModal();
            if (typeof _onChangedCb === 'function') _onChangedCb();
            document.dispatchEvent(new CustomEvent('product:deleted'));
        } catch (error) {
            alert(`No se pudo eliminar el producto:\n${error.message}`);
        }
    }

    function _formatPrice(value) {
        if (value === null || value === undefined) return 'N/D';
        return `C$ ${Number(value).toFixed(2)}`;
    }

    window.initProductDetailModal = initProductDetailModal;
    window.openProductDetailModal = openProductDetailModal;
    window.closeProductDetailModal = closeProductDetailModal;
})();
