import axios from "axios";
import DatabaseErrors from "../error/errors/database.errors";

/**
 * Determine the name (and brand) of an item from its upc barcode number.
 * @param upc The upc barcode number
 * @returns The name (and brand, if found), of the item.
 */
const nameFromUPC = async (upc: string) => {
  const { data }: any = await axios.get(
    `${process.env.EDAMAM_DATABASE_URL}/parser`,
    {
      params: {
        app_id: process.env.EDAMAM_APP_ID,
        app_key: process.env.EDAMAM_APP_KEY,
        upc: upc,
      },
    }
  );
  if (!data) {
    return Promise.reject(
      DatabaseErrors.NOT_FOUND("An item with this UPC code was not found")
    );
  }

  console.log(data);

  const food = data.hints[0]?.food;

  const name = food?.label;
  const brand = food?.brand;

  let fullName: string;
  if (name && brand) {
    fullName = `${name}, ${brand}`;
  } else if (name) {
    fullName = name;
  } else {
    return Promise.reject(
      DatabaseErrors.NOT_FOUND("An item with this UPC code was not found")
    );
  }
  return fullName;
};

export default nameFromUPC;
