CREATE TABLE location (
   location_id SERIAL PRIMARY KEY,
   name varchar(90) NOT NULL,
   us_state_id int, -- will reference state_table i guess
   coord_x NUMERIC(15,2),
   coord_y NUMERIC(15,2)
);

CREATE TABLE us_state (
   us_state_id SERIAL PRIMARY KEY, -- these will be populated
   name VARCHAR(255) NOT NULL
);

ALTER TABLE location
   ADD CONSTRAINT fk_location_us_state_id
   FOREIGN KEY (us_state_id) REFERENCES us_state(us_state_id);



CREATE TABLE articles (
   article_id SERIAL PRIMARY KEY,
   headline VARCHAR(255),
   uri VARCHAR(255) NOT NULL,
   saved BOOLEAN NOT NULL DEFAULT TRUE
)

CREATE UNIQUE INDEX CONCURRENTLY  articles_uri ON articles(uri);

alter table articles 
   ADD CONSTRAINT unique_uri_uk UNIQUE(uri);
