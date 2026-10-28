function createProductCard(product) {
    const image = ProductImage.resolveUrl(product.imageUrl);
    const wholesale = _formatPrice(product.wholesalePrice);
    const retail = _formatPrice(product.retailPrice);
    const statusText = product.isActive ? 'Activo' : 'Inactivo';
    const statusClass = product.isActive ? 'active' : 'inactive';

    return `
        <div
          class="product-card"
          data-product-id="${product.id}"
          data-name="${_escape(product.productName)}"
          data-line="${_escape(product.lineName)}"
          data-flavor="${_escape(product.flavorName)}"
          data-presentation="${_escape(product.presentationName)}"
        >
          <span class="product-card-status ${statusClass}">${statusText}</span>

          <div class="product-card-image">
            <img src="${_escape(image)}" alt="${_escape(product.productName)}">
          </div>

          <div class="product-card-body">
            <h3 class="product-card-name">${_escape(product.productName)}</h3>

            <div class="product-card-meta">
              <span class="meta-tag line">${_escape(product.lineName)}</span>
              <span class="meta-tag flavor">${_escape(product.flavorName)}</span>
              <span class="meta-tag presentation">${_escape(product.presentationName)}</span>
            </div>

            <div class="product-card-prices">
              <div class="price-group">
                <span class="price-label">Mayoreo</span>
                <span class="price-value wholesale">${wholesale}</span>
              </div>
              <div class="price-group">
                <span class="price-label">Detalle</span>
                <span class="price-value retail">${retail}</span>
              </div>
            </div>
          </div>

          <button class="btn-view" type="button" data-product-id="${product.id}" title="Ver detalles">
            <i data-lucide="eye"></i>
          </button>
        </div>
    `;
}

function _formatPrice(value) {
    if (value === null || value === undefined) return 'N/D';
    return `C$ ${Number(value).toFixed(2)}`;
}

function _escape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
