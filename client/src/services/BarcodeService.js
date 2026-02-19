import axios from 'axios';

const OPENFOODFACTS_API = 'https://world.openfoodfacts.org/api/v0/product/';

export const barcodeService = {
  /**
   * Fetch product details from OpenFoodFacts
   * @param {string} barcode 
   * @returns {Promise<{name: string, image: string, category: string} | null>}
   */
  getProductByBarcode: async (barcode) => {
    try {
      const response = await axios.get(`${OPENFOODFACTS_API}${barcode}.json`);
      
      if (response.data && response.data.status === 1) {
        const product = response.data.product;
        return {
          name: product.product_name_ar || product.product_name || '',
          image: product.image_url || product.image_front_url || '',
          category: product.categories_tags?.[0]?.replace('en:', '') || 'أخرى',
          brand: product.brands || ''
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching product from OpenFoodFacts:', error);
      return null;
    }
  }
};
