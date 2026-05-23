type LocationData = {
  address: string;
  lat: number;
  lng: number;
} | null;

let locationData: LocationData = null; //Dosya seviyesinde global değişken tanımlıyorsun. Seçilen konum burada saklanıyor.
let listener: ((data: LocationData) => void) | null = null;

//Yeni konum verisini kaydetmek.
export const setLocation = (data: LocationData) => {
  locationData = data;
  if (listener) listener(data);
};

//Seçilen konumu döndürür.
export const getLocation = () => locationData;

// Konum değişirse bana bildir.
export const subscribeLocation = (fn: (data: LocationData) => void) => {
  listener = fn;
  return () => {
    listener = null; //Component kapanınca listener temizleniyor.
  };
};

//location-picker.tsx, edit_ad.tsx, create.tsx ekranı arasında veri taşımak için kullanılıyor.
/*Bu Dosyanın Genel Mantığı

Kullanıcı:

Haritadan konum seçiyor
locationStore’a kaydediliyor
Diğer ekran bu veriyi dinliyor
Konum otomatik dolduruluyor

Yani ekranlar arası veri transferi sağlıyor.*/
