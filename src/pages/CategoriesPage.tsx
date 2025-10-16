
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Loader2, Upload, Package } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../firebase';

interface Category {
  id: string;
  name: string;
  key: string;
  image: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    image: '',
    isActive: true
  });

  useEffect(() => {
    const categoriesRef = collection(database, 'categories');
    
    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const categoriesArray: Category[] = [];
      snapshot.forEach((doc) => {
        categoriesArray.push({
          id: doc.id,
          ...doc.data()
        } as Category);
      });
      setCategories(categoriesArray.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching categories:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const generateKey = (name: string) => {
    return name.toLowerCase()
      .replace(/[&]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, categoryName: string): Promise<string> => {
    const storageRef = ref(storage, `categories/${categoryName}.png`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (!imageFile) {
      alert('Please select an image');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadImage(imageFile, formData.name);
      const categoryKey = generateKey(formData.name);
      
      const categoriesRef = collection(database, 'categories');
      await addDoc(categoriesRef, {
        name: formData.name,
        key: categoryKey,
        image: imageUrl,
        isActive: formData.isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setShowModal(false);
      resetForm();
      alert('Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = formData.image;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, formData.name);
      }

      const categoryKey = generateKey(formData.name);
      const categoryRef = doc(database, 'categories', editingCategory.id);
      
      await updateDoc(categoryRef, {
        name: formData.name,
        key: categoryKey,
        image: imageUrl,
        isActive: formData.isActive,
        updatedAt: serverTimestamp()
      });
      
      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      alert('Category updated successfully!');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      return;
    }

    try {
      const categoryRef = doc(database, 'categories', categoryId);
      await deleteDoc(categoryRef);
      alert('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      key: category.key,
      image: category.image,
      isActive: category.isActive
    });
    setImagePreview(category.image);
    setImageFile(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      key: '',
      image: '',
      isActive: true
    });
    setImageFile(null);
    setImagePreview('');
    setEditingCategory(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-zinc-400 text-sm mt-1">{categories.length} total categories</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-100 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all group"
          >
            <div className="relative h-48 bg-zinc-950">
              {category.image ? (
                <img 
                  src={category.image} 
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-zinc-700" />
                </div>
              )}
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => handleEditClick(category)}
                  className="p-2 bg-zinc-800/90 hover:bg-zinc-700 rounded-lg text-white transition-colors backdrop-blur-sm"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  className="p-2 bg-red-900/90 hover:bg-red-800 rounded-lg text-white transition-colors backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {!category.isActive && (
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 bg-red-900/90 text-red-200 text-xs font-medium rounded backdrop-blur-sm">
                    Inactive
                  </span>
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="text-white font-semibold text-lg">{category.name}</h3>
              <p className="text-zinc-500 text-sm mt-1 font-mono">{category.key}</p>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">No categories yet</p>
          <p className="text-zinc-500 text-sm mt-2">Click "Add Category" to create your first one</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-zinc-300 text-sm font-medium block mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sports & fitness"
                  className="w-full h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-sm font-medium block mb-2">
                  Category Image
                </label>
                <div className="space-y-3">
                  {imagePreview && (
                    <div className="relative w-full h-48 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
                      <img 
                        src={imagePreview} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <label className="w-full h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-950/50 text-white hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-5 h-5" />
                    {imageFile ? imageFile.name : 'Choose Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                <span className="text-zinc-300 text-sm font-medium">Active Status</span>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.isActive ? 'bg-green-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    formData.isActive ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseModal}
                  disabled={uploading}
                  className="flex-1 h-12 rounded-xl border border-zinc-800 text-white font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                  disabled={uploading}
                  className="flex-1 h-12 rounded-xl bg-white text-black font-medium hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingCategory ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};