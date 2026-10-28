const SaleProductsTable = (() => {
    function render(tbody, items, formatCurrency, escapeHtml) {
        if (!tbody) return;

        if (!items.length) {
            tbody.innerHTML = `
                <tr class="invoice-empty-row">
                  <td colspan="5">
                    <div class="invoice-empty">
                      <i data-lucide="receipt-text"></i>
                      <span>No hay productos agregados</span>
                    </div>
                  </td>
                </tr>`;
            _refreshIcons();
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
              <td>
                <div class="invoice-product-name">${escapeHtml(item.productName)}</div>
              </td>
              <td style="text-align: center">
                <span class="quantity-pill">${item.quantity}</span>
              </td>
              <td style="text-align: right">${formatCurrency(item.unitPrice)}</td>
              <td style="text-align: right">
                <strong>${formatCurrency(item.subtotal)}</strong>
              </td>
              <td style="text-align: center">
                <button class="table-action-btn" type="button" data-remove-product-id="${item.productId}" title="Eliminar">
                  <i data-lucide="trash-2"></i>
                </button>
              </td>
            </tr>
        `).join('');

        _refreshIcons();
    }

    function bindRemove(tbody, callback) {
        tbody?.querySelectorAll('[data-remove-product-id]').forEach(button => {
            button.addEventListener('click', () => callback(Number(button.dataset.removeProductId)));
        });
    }

    function _refreshIcons() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    return {
        render,
        bindRemove,
    };
})();
