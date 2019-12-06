create table geolocation
(                                                                               geo_code int not null PRIMARY KEY,                                     name varchar(70),                                                               constraint geo_code_uk UNIQUE (geo_code)
);

copy geolocation(name, geo_code) from '/Users/mark/Documents/CS313/geo_locations_CITY-ONLY.csv' DELIMITER ',' CSV HEADER;