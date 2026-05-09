import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { GroceryList, GroceryItem, ExpenseCategory } from './store';
import { useLedgr } from './LedgrContext';

const STORAGE_KEY = 'ledgr_grocery_lists';
const PHOTO_DIR = `${FileSystem.documentDirectory || ''}grocery_photos/`;

interface GroceryContextType {
  lists: GroceryList[];
  isLoaded: boolean;
  createList: (title: string) => Promise<GroceryList>;
  updateList: (list: GroceryList) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addItem: (listId: string, item: Omit<GroceryItem, 'id'>) => Promise<void>;
  updateItem: (listId: string, item: GroceryItem) => Promise<void>;
  removeItem: (listId: string, itemId: string) => Promise<void>;
  toggleBought: (listId: string, itemId: string) => Promise<void>;
  addPhoto: (listId: string, uri: string) => Promise<void>;
  removePhoto: (listId: string, photoUri: string) => Promise<void>;
  markComplete: (id: string) => Promise<void>;
  clearCompletedLists: () => Promise<void>;
  getStorageSize: () => Promise<number>;
  logAsExpenses: (listId: string) => Promise<{ success: boolean; count: number; message: string }>;
}

const GroceryContext = createContext<GroceryContextType | undefined>(undefined);

export const GroceryProvider = ({ children }: { children: ReactNode }) => {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { addExpense } = useLedgr();

  // Ensure photo directory exists
  useEffect(() => {
    (async () => {
      const dirInfo = await FileSystem.getInfoAsync(PHOTO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
      }
    })();
  }, []);

  // Load lists from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setLists(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to load grocery lists', e);
      }
      setIsLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (updated: GroceryList[]) => {
    setLists(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

  const createList = async (title: string): Promise<GroceryList> => {
    const newList: GroceryList = {
      id: generateId(),
      title,
      createdAt: new Date().toISOString(),
      status: 'active',
      items: [],
      photoUris: [],
    };
    const updated = [newList, ...lists];
    await persist(updated);
    return newList;
  };

  const updateList = async (list: GroceryList) => {
    setLists(prev => {
      const updated = prev.map(l => l.id === list.id ? list : l);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteList = async (id: string) => {
    setLists(prev => {
      const list = prev.find(l => l.id === id);
      if (list) {
        for (const uri of list.photoUris) {
          try {
            FileSystem.getInfoAsync(uri).then(info => {
              if (info.exists) FileSystem.deleteAsync(uri);
            });
          } catch (_) {}
        }
      }
      const updated = prev.filter(l => l.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const addItem = async (listId: string, item: Omit<GroceryItem, 'id'>) => {
    const newItem: GroceryItem = { ...item, id: generateId() };
    setLists(prev => {
      const updated = prev.map(l => {
        if (l.id === listId) return { ...l, items: [...l.items, newItem] };
        return l;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateItem = async (listId: string, item: GroceryItem) => {
    setLists(prev => {
      const updated = prev.map(l => {
        if (l.id === listId) {
          return { ...l, items: l.items.map(i => i.id === item.id ? item : i) };
        }
        return l;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = async (listId: string, itemId: string) => {
    setLists(prev => {
      const updated = prev.map(l => {
        if (l.id === listId) {
          return { ...l, items: l.items.filter(i => i.id !== itemId) };
        }
        return l;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleBought = async (listId: string, itemId: string) => {
    setLists(prev => {
      const updated = prev.map(l => {
        if (l.id === listId) {
          return {
            ...l,
            items: l.items.map(i => i.id === itemId ? { ...i, isBought: !i.isBought } : i),
          };
        }
        return l;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const addPhoto = async (listId: string, sourceUri: string) => {
    // 1. Optimistic Update: Add sourceUri to state immediately
    const filename = `${listId}_${Date.now()}.jpg`;
    const destUri = PHOTO_DIR + filename;

    setLists(prev => {
      const updated = prev.map(l => {
        if (l.id === listId) return { ...l, photoUris: [...l.photoUris, sourceUri] };
        return l;
      });
      return updated;
    });

    // 2. Background Compression Task
    (async () => {
      try {
        const result = await ImageManipulator.manipulateAsync(
          sourceUri,
          [{ resize: { width: 1600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        await FileSystem.moveAsync({ from: result.uri, to: destUri });

        // Replace temp sourceUri with permanent destUri
        setLists(prev => {
          const final = prev.map(l => {
            if (l.id === listId) {
              return { 
                ...l, 
                photoUris: l.photoUris.map(u => u === sourceUri ? destUri : u) 
              };
            }
            return l;
          });
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(final));
          return final;
        });
      } catch (e) {
        console.error('Photo compression failed', e);
      }
    })();
  };

  const removePhoto = async (listId: string, photoUri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(photoUri);
      if (info.exists) await FileSystem.deleteAsync(photoUri);
    } catch (_) {}
    setLists(prev => {
      const updated = prev.map(l => {
        if (l.id === listId) return { ...l, photoUris: l.photoUris.filter(u => u !== photoUri) };
        return l;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const markComplete = async (id: string) => {
    setLists(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, status: 'complete' as const } : l);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearCompletedLists = async () => {
    setLists(prev => {
      const completed = prev.filter(l => l.status === 'complete');
      for (const list of completed) {
        for (const uri of list.photoUris) {
          try {
            FileSystem.getInfoAsync(uri).then(info => {
              if (info.exists) FileSystem.deleteAsync(uri);
            });
          } catch (_) {}
        }
      }
      const updated = prev.filter(l => l.status !== 'complete');
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const getStorageSize = async (): Promise<number> => {
    let totalBytes = 0;
    // JSON data size
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) totalBytes += new Blob([raw]).size;
    // Photo files size
    for (const list of lists) {
      for (const uri of list.photoUris) {
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists && 'size' in info) totalBytes += (info as any).size || 0;
        } catch (_) {}
      }
    }
    return totalBytes;
  };

  const logAsExpenses = async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return { success: false, count: 0, message: 'List not found' };
    
    const boughtItems = list.items.filter(i => i.isBought);
    if (boughtItems.length === 0) return { success: false, count: 0, message: 'No items marked as bought' };

    const itemsWithPrice = boughtItems.filter(i => i.estimatedPrice > 0);
    if (itemsWithPrice.length === 0) return { success: false, count: 0, message: 'None of the bought items have prices' };

    // Group by category
    const grouped: Record<string, { total: number; names: string[] }> = {};
    for (const item of itemsWithPrice) {
      const cat = item.category;
      if (!grouped[cat]) grouped[cat] = { total: 0, names: [] };
      grouped[cat].total += item.estimatedPrice * item.quantity;
      grouped[cat].names.push(item.name);
    }
    
    // Create one expense per category
    for (const [cat, data] of Object.entries(grouped)) {
      const name = data.names.length <= 2
        ? data.names.join(', ')
        : `${data.names.slice(0, 2).join(', ')} +${data.names.length - 2} more`;
      await addExpense({
        name: `Grocery: ${name}`,
        amount: data.total,
        category: cat as ExpenseCategory,
        date: new Date().toISOString(),
      });
    }
    
    return { 
      success: true, 
      count: itemsWithPrice.length, 
      message: `Successfully logged ${itemsWithPrice.length} items across ${Object.keys(grouped).length} categories.` 
    };
  };

  return (
    <GroceryContext.Provider value={{
      lists, isLoaded, createList, updateList, deleteList,
      addItem, updateItem, removeItem, toggleBought,
      addPhoto, removePhoto, markComplete, clearCompletedLists,
      getStorageSize, logAsExpenses,
    }}>
      {children}
    </GroceryContext.Provider>
  );
};

export const useGrocery = () => {
  const context = useContext(GroceryContext);
  if (context === undefined) {
    throw new Error('useGrocery must be used within a GroceryProvider');
  }
  return context;
};
