import { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue, set, remove } from "firebase/database";

export const useFirebase = (path) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const dbRef = ref(db, path);
    onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(Object.values(val));
      } else {
        setData([]);
      }
    });
  }, [path]);

  const save = (item) => {
    set(ref(db, `${path}/${item.id}`), item);
  };

  const deleteItem = (id) => {
    remove(ref(db, `${path}/${id}`));
  };

  return { data, save, deleteItem };
};
