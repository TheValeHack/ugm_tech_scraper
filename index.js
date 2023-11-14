const util = require("util")
const multer = require("multer")
const pdf = require("pdf-parse")
const mysql = require("mysql")
const axios = require("axios")
const cheerio = require("cheerio")
const express = require("express")
const app = express()
const port = 3000
const scrape_interval = 3

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const connection = require('./config/database')

// Dosen

const scrape_dosen_dtedi = async () => {
    try {
        const response = await axios.get("https://tedi.sv.ugm.ac.id/id/staff-pengajar/")
        const tag = cheerio.load(response.data)
        const table_data = tag("table").toArray()
        const data = []

        table_data.forEach(table => {
            let data_dosen = {}
            const tr_data = tag(table).find("tr").toArray()
            tr_data.forEach(tr => {
                const td = tag(tr).find("td").toArray()
                if(td.length == 3){
                    const img =  (tag(td[0]).children().attr("src") == null) ? tag(td[0]).children().children().attr("src") : tag(td[0]).children().attr("src")
                    let key = tag(td[1]).text().toLowerCase()
                    const value = tag(td[2]).text().trim()
                    data_dosen["foto"] = img
                    data_dosen[key] = value
                } else if (td.length == 2){
                    let key = tag(td[0]).text().toLowerCase()
                    const value = tag(td[1]).text().trim()
                    data_dosen[key] = value
                } else {
                    const social = tag(td).find("a").toArray().map(a => tag(a).attr("href"))
                    data_dosen["social"] = social
                }
            })

            if(Object.keys(data_dosen).includes("\n\n\n\n111198210201109201\n\n\n\n")){
                data_dosen["foto"] = "https://tedi.sv.ugm.ac.id/wp-content/uploads/sites/1267/2020/08/3938Unan-Yusmaniar-putih-edit-300x300.jpg"
                const newKeys = {"\n\n\n\n111198210201109201\n\n\n\n": "nip"}
                let keyValues = Object.keys(data_dosen).map(key => {
                    const newKey = newKeys[key] || key
                    return { [newKey]: data_dosen[key] }
                })
                data_dosen = Object.assign({}, ...keyValues)
            }
            if(Object.keys(data_dosen).length >= 3){
                data.push(data_dosen)
            }
        })

        return data
    } catch (error) {
        console.error("Terjadi error: ", error)
        return JSON.stringify({ error: `Terjadi error: ${error}` })
    }
}

const scrape_dosen_dteti = async () => {
    try {
        const response = await axios.get("https://jteti.ugm.ac.id/tenaga-pendidik/")
        const tag = cheerio.load(response.data)
        const table_data = tag("table tr").toArray()
        const data = []

        table_data.forEach(tr => {
            const data_dosen = {}
            const td = tag(tr).find("td")
            const img = tag(td[0]).children().attr("src")
            const biodata = tag(td[1]).text().split("\n")
            const social = []

            if(biodata.length > 4){
                for(let i = 4; i < biodata.length; i++){
                    social.push(biodata[i].trim())
                }
            }

            data_dosen["foto"] = img.trim()
            data_dosen["nama"] = biodata[0].trim()
            data_dosen["jabatan"] = biodata[1].replace(/[()]/g, '').trim()
            data_dosen["bidang keahlian"] = biodata[3].trim()
            data_dosen["social"] = social            

            data.push(data_dosen)
        })

        return data
    } catch (error) {
        console.error("Terjadi error: ", error)
        return JSON.stringify({ error: `Terjadi error: ${error}` })
    }
}

const scrape_dosen_dike = async () => {
    try {
        const response = await axios.get("https://dcse.fmipa.ugm.ac.id/site/id/profil-pengajar-2/")
        const tag = cheerio.load(response.data)
        const table_data = tag("table tr").toArray().slice(1)
        const data = []

        table_data.forEach(tr => {
            const data_dosen = {}
            const td = tag(tr).find("td")
            let nama = tag(td[1]).children().children().text().trim()
            let profil_link = tag(td[1]).children().children().attr("href")
            let jabatan = tag(td[2]).find("div").toArray().map(div => tag(div).text().trim())
            let bidang_keahlian = tag(td[3]).find("div").toArray().map(div => tag(div).text().trim()).filter(data => data != "Google Scholar Profile")
            if((nama == "") || (nama == null)){
                nama = tag(td[1]).children().text().trim()
            }
            if((profil_link == "") || (profil_link == null)){
                profil_link = tag(td[1]).children().attr("href")
            }
            if(bidang_keahlian == [] || bidang_keahlian == null || bidang_keahlian.length == 0){
                bidang_keahlian = tag(td[3]).find("li").toArray().map(li => tag(li).text().trim()).filter(data => data != "Google Scholar Profile")
            }

            const social = [profil_link]

            if(tag(td[3]).find("a").attr("href") != null){
                social.push(tag(td[3]).find("a").attr("href"))
            }

            data_dosen["nama"] = nama
            data_dosen["jabatan"] = jabatan
            data_dosen["bidang keahlian"] = bidang_keahlian
            data_dosen["social"] = social            

            if((data_dosen["nama"] != "") && (data_dosen["nama"] != null)){
                data.push(data_dosen)
            }
        })

        return data
    } catch (error) {
        console.error("Terjadi error: ", error)
        return JSON.stringify({ error: `Terjadi error: ${error}` })
    }
}

const get_days_difference = (date1, date2)  => {
    const milliseconds_difference = date2 - date1
    const days_difference = milliseconds_difference / (1000 * 60 * 60 * 24)
    return days_difference
}

const get_dosen_dtedi = (connection, callback) => {
    connection.query("SELECT * FROM last_scraped", async (err, rows) => {
        if (err) {
            callback(null, {"Error": err})
        } else {
            const last_scraped = rows[0]
            const last_scraped_date = new Date(last_scraped["dosen_dtedi"])
            const current_date = new Date()
            const days_difference = Math.floor(get_days_difference(last_scraped_date, current_date))

            if(days_difference >= scrape_interval){
                const new_scraped_date = current_date.toISOString().slice(0, 19).replace('T', ' ')
                const old_scraped_date = last_scraped["dosen_dtedi"].toISOString().slice(0, 19).replace('T', ' ').split(" ")[0]
                connection.query(`UPDATE last_scraped SET dosen_dtedi = '${new_scraped_date}' WHERE dosen_dtedi LIKE '%${old_scraped_date}%'`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                })
                const data_dosen_dtedi = await scrape_dosen_dtedi()

                connection.query(`DELETE FROM dosen_dtedi`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                  })

                data_dosen_dtedi.forEach(dosen => {
                    const foto = dosen["foto"] != null ? dosen["foto"].replace(/'/g, "\\'") : "" 
                    const nama = dosen["nama"] != null ? dosen["nama"].replace(/'/g, "\\'") : "" 
                    const nip = dosen["nip"] != null ? dosen["nip"].toString().replace(/'/g, "\\'") : "" 
                    const nika = dosen["nika"] != null ? dosen["nika"].toString().replace(/'/g, "\\'") : "" 
                    const bidang_keahlian = dosen["bidang keahlian"] != null ? dosen["bidang keahlian"].replace(/'/g, "\\'") : "" 
                    const email = dosen["email"] != null ? dosen["email"].replace(/'/g, "\\'") : "" 
                    const social = dosen["social"] != null ? JSON.stringify(dosen["social"]).replace(/'/g, "\\'") : ""
                    
                    const insert_query = `INSERT INTO dosen_dtedi (foto, nama, nip, nika, bidang_keahlian, email, social) VALUES ('${foto}', '${nama}', '${nip}', '${nika}', '${bidang_keahlian}', '${email}', '${social}')`

                    connection.query(insert_query, (err, rows) => {
                        if (err) {
                            callback(null, {"Error": err})
                        }
                    })
                })

                callback(null, data_dosen_dtedi)
            } else {
                connection.query(`SELECT * FROM dosen_dtedi`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    } else {
                        callback(null, rows)
                    }
                  })
            }
        }
    })
}

const get_dosen_dteti = (connection, callback) => {
    connection.query("SELECT * FROM last_scraped", async (err, rows) => {
        if (err) {
            callback(null, {"Error": err})
        } else {
            const last_scraped = rows[0]
            const last_scraped_date = new Date(last_scraped["dosen_dteti"])
            const current_date = new Date()
            const days_difference = Math.floor(get_days_difference(last_scraped_date, current_date))

            if(days_difference >= scrape_interval){
                const new_scraped_date = current_date.toISOString().slice(0, 19).replace('T', ' ')
                const old_scraped_date = last_scraped["dosen_dteti"].toISOString().slice(0, 19).replace('T', ' ').split(" ")[0]
                connection.query(`UPDATE last_scraped SET dosen_dteti = '${new_scraped_date}' WHERE dosen_dteti LIKE '%${old_scraped_date}%'`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                })
                const data_dosen_dteti = await scrape_dosen_dteti()

                connection.query(`DELETE FROM dosen_dteti`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                  })

                data_dosen_dteti.forEach(dosen => {
                    const foto = dosen["foto"] != null ? dosen["foto"].replace(/'/g, "\\'") : "" 
                    const nama = dosen["nama"] != null ? dosen["nama"].replace(/'/g, "\\'") : "" 
                    const jabatan = dosen["jabatan"] != null ? dosen["jabatan"].replace(/'/g, "\\'") : "" 
                    const bidang_keahlian = dosen["bidang keahlian"] != null ? dosen["bidang keahlian"].replace(/'/g, "\\'") : "" 
                    const social = dosen["social"] != null ? JSON.stringify(dosen["social"]).replace(/'/g, "\\'") : ""
                    
                    const insert_query = `INSERT INTO dosen_dteti (foto, nama, jabatan, bidang_keahlian, social) VALUES ('${foto}', '${nama}', '${jabatan}', '${bidang_keahlian}', '${social}')`

                    connection.query(insert_query, (err, rows) => {
                        if (err) {
                            callback(null, {"Error": err})
                        }
                    })
                })

                callback(null, data_dosen_dteti)
            } else {
                connection.query(`SELECT * FROM dosen_dteti`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    } else {
                        callback(null, rows)
                    }
                  })
            }
        }
    })
}

const get_dosen_dike = (connection, callback) => {
    connection.query("SELECT * FROM last_scraped", async (err, rows) => {
        if (err) {
            callback(null, {"Error": err})
        } else {
            const last_scraped = rows[0]
            const last_scraped_date = new Date(last_scraped["dosen_dike"])
            const current_date = new Date()
            const days_difference = Math.floor(get_days_difference(last_scraped_date, current_date))

            if(days_difference >= scrape_interval){
                const new_scraped_date = current_date.toISOString().slice(0, 19).replace('T', ' ')
                const old_scraped_date = last_scraped["dosen_dike"].toISOString().slice(0, 19).replace('T', ' ').split(" ")[0]
                connection.query(`UPDATE last_scraped SET dosen_dike = '${new_scraped_date}' WHERE dosen_dike LIKE '%${old_scraped_date}%'`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                })
                const data_dosen_dike = await scrape_dosen_dike()

                connection.query(`DELETE FROM dosen_dike`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                  })

                data_dosen_dike.forEach(dosen => {
                    const nama = dosen["nama"] != null ? dosen["nama"].replace(/'/g, "\\'") : "" 
                    const jabatan = dosen["jabatan"] != null ? JSON.stringify(dosen["jabatan"]).replace(/'/g, "\\'") : "" 
                    const bidang_keahlian = dosen["bidang keahlian"] != null ? JSON.stringify(dosen["bidang keahlian"]).replace(/'/g, "\\'") : "" 
                    const social = dosen["social"] != null ? JSON.stringify(dosen["social"]).replace(/'/g, "\\'") : ""
                    
                    const insert_query = `INSERT INTO dosen_dike (nama, jabatan, bidang_keahlian, social) VALUES ('${nama}', '${jabatan}', '${bidang_keahlian}', '${social}')`

                    connection.query(insert_query, (err, rows) => {
                        if (err) {
                            callback(null, {"Error": err})
                        }
                    })
                })

                callback(null, data_dosen_dike)
            } else {
                connection.query(`SELECT * FROM dosen_dike`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    } else {
                        callback(null, rows)
                    }
                  })
            }
        }
    })
}

const get_dosen_dtedi_promise = util.promisify(get_dosen_dtedi)
const get_dosen_dteti_promise = util.promisify(get_dosen_dteti)
const get_dosen_dike_promise = util.promisify(get_dosen_dike)

const get_dosen_all = async (connection) => {
    try {
        const dosen_dtedi = await get_dosen_dtedi_promise(connection)
        const dosen_dteti = await get_dosen_dteti_promise(connection)
        const dosen_dike = await get_dosen_dike_promise(connection)

        return dosen_dtedi.concat(dosen_dteti, dosen_dike)
    } catch (error) {
        console.error("Terjadi error:", error)
        return []
    }
}

// Matkul

const scrape_matkul_dtedi = () => {
    // dtedi doesnt have any web that contains matkul to scrape, so i just make the matkul data manually
    return [{"kode":"SVPL214101","nama":"Pengantar Teknologi Informasi","sks":"2"},{"kode":"SVPL214102","nama":"Matematika Teknik","sks":"2"},{"kode":"SVPL214103","nama":"Matematika Diskrit","sks":"2"},{"kode":"SVPL214104","nama":"Bahasa Inggris 1","sks":"2"},{"kode":"SVPL214105","nama":"Praktikum Teknologi Informasi dan Instalasi Komputer","sks":"2"},{"kode":"SVPL214106","nama":"Praktikum Pemrograman Komputer","sks":"2"},{"kode":"SVPL214107","nama":"Algoritma dan Pemrograman","sks":"2"},{"kode":"SVPL214108","nama":"Keselamatan dan Kesehatan Kerja","sks":"2"},{"kode":"SVPL214109","nama":"Praktikum Desain Elementer","sks":"2"},{"kode":"SVPL214201","nama":"Bahasa Inggris 2","sks":"2"},{"kode":"SVPL214202","nama":"Aljabar Vektor dan Matriks","sks":"2"},{"kode":"SVPL214203","nama":"Analisis Algoritma dan Struktur Data","sks":"2"},{"kode":"SVPL214204","nama":"Praktikum Struktur Data","sks":"2"},{"kode":"SVPL214205","nama":"Basis Data","sks":"2"},{"kode":"SVPL214206","nama":"Praktikum Basis Data","sks":"2"},{"kode":"SVPL214207","nama":"Praktikum Pemrograman Web 1","sks":"2"},{"kode":"SVPL214208","nama":"Pemrograman Berorientasi Objek","sks":"2"},{"kode":"SVPL214209","nama":"Praktikum Pemrograman Berorientasi Objek","sks":"2"},{"kode":"SVPL214301","nama":"Metode dan Model Pengembangan Perangkat Lunak","sks":"2"},{"kode":"SVPL214302","nama":"Rekayasa Kebutuhan Perangkat Lunak","sks":"2"},{"kode":"SVPL214303","nama":"Analisis dan Desain Perangkat Lunak","sks":"2"},{"kode":"SVPL214304","nama":"Praktikum Desain Perangkat Lunak","sks":"2"},{"kode":"SVPL214305","nama":"Praktikum Pemrograman Web 2","sks":"2"},{"kode":"SVPL214306","nama":"Praktikum Pemrograman Perangkat Bergerak 1","sks":"2"},{"kode":"SVPL214307","nama":"Proyek Aplikasi Dasar 1","sks":"2"},{"kode":"SVPL214308","nama":"Jaringan Komputer","sks":"2"},{"kode":"SVPL214309","nama":"Manajemen Proyek","sks":"2"},{"kode":"SVPL214310","nama":"Arsitektur Perangkat Lunak","sks":"2"},{"kode":"SVPL214401","nama":"Praktik Industri","sks":"6"},{"kode":"SVPL214402","nama":"Proyek Aplikasi Dasar 2","sks":"2"},{"kode":"SVPL214403","nama":"Keamanan Pengembangan Perangkat Lunak","sks":"2"},{"kode":"SVPL214404","nama":"Interoperabilitas","sks":"2"},{"kode":"SVPL214405","nama":"Praktikum Sistem Administrasi dan Informasi Terdistribusi","sks":"2"},{"kode":"SVPL214406","nama":"Praktikum Pemrograman Aplikasi Perangkat Bergerak 2","sks":"2"},{"kode":"SVPL214407","nama":"Praktikum Animasi dan Desain Multimedia","sks":"2"},{"kode":"SVPL214408","nama":"Animasi dan Desain Multimedia","sks":"2"},{"kode":"SVPL214501","nama":"Konstruksi dan Evolusi Perangkat Lunak","sks":"2"},{"kode":"SVPL214502","nama":"Bahasa Indonesia","sks":"2"},{"kode":"SVPL214503","nama":"Kewarganegaraan","sks":"2"},{"kode":"SVPL214504","nama":"Pengembangan Game dan Teknologi Immersive","sks":"2"},{"kode":"SVPL214505","nama":"Praktikum Pengembangan Game","sks":"2"},{"kode":"SVPL214506","nama":"Agama","sks":"2"},{"kode":"SVPL214507","nama":"Praktikum Pengujian Perangkat Lunak","sks":"2"},{"kode":"SVPL214508","nama":"PROYEK MANDIRI LINTAS DISIPLIN ILMU 1","sks":"2"},{"kode":"SVPL214509","nama":"Kapita Selekta","sks":"2"},{"kode":"SVPL214510","nama":"Pancasila","sks":"2"},{"kode":"SVPL214601","nama":"PROYEK MANDIRI LINTAS DISIPLIN ILMU 2","sks":"2"},{"kode":"SVPL214602","nama":"Paparan Kompetensi Global","sks":"2"},{"kode":"SVPL214603","nama":"Statistika","sks":"2"},{"kode":"SVPL214604","nama":"Praktikum Komunikasi dan Presentasi","sks":"2"},{"kode":"","nama":"Mata kuliah pilihan / MBKM","sks":"12"},{"kode":"SVPL214701","nama":"Ide Kreatif & Kewirausahaan","sks":"2"},{"kode":"SVPL214702","nama":"Proyek Pengembangan Perangkat Lunak","sks":"2"},{"kode":"SVPL214703","nama":"Metodologi Penelitian","sks":"2"},{"kode":"","nama":"Mata kuliah pilihan / MBKM","sks":"12"},{"kode":"","nama":"KKN","sks":"3"},{"kode":"","nama":"Proyek Akhir","sks":"6"}]
}

const scrape_matkul_dteti = async () => {
    try {
        const response = await axios.get("https://sarjana.jteti.ugm.ac.id/program-sarjana/program-studi-teknologi-informasi/kurikulum-2021/")
        const tag = cheerio.load(response.data)
        const table_data = tag("table tr").toArray().slice(1)
        const data = []

        table_data.forEach(tr => {
            const td = tag(tr).find("td")
            const is_integer = angka => /^\d+$/.test(angka)

            if(is_integer(tag(td[0]).text().trim())){
                const data_matkul = {}
                const kode = tag(td[1]).text().trim()
                const detail = tag(td[2]).children().children().attr("href") != null ? "https://sarjana.jteti.ugm.ac.id/"+tag(td[2]).children().children().attr("href").trim() : ""
                const nama = tag(td[2]).text().trim()
                const sks = tag(td[3]).text().trim()
                const kriteria = tag(td[4]).text().trim()

                data_matkul["kode"] = kode
                data_matkul["nama"] = nama
                data_matkul["detail"] = detail
                data_matkul["sks"] = sks
                data_matkul["kriteria"] = kriteria
                
                data.push(data_matkul)
            }
        })

        return data
    } catch (error) {
        console.error("Terjadi error: ", error)
        return JSON.stringify({ error: `Terjadi error: ${error}` })
    }
}


const scrape_matkul_dike = async () => {
    try {
        const response = await axios.get("https://dcse.fmipa.ugm.ac.id/site/id/program-s1-ilmu-komputer/ik-matakuliah/")
        const tag = cheerio.load(response.data)
        const table_data = tag("table tr").toArray().slice(1)
        const data = []
        let index = ""
        let stop = false

        table_data.forEach(tr => {
            const td = tag(tr).find("td")
            if(td.length >= 6){
                const matkul_no = td.length > 6 ? tag(td[1]).text().trim() : tag(td[0]).text().trim()
                index = matkul_no
                if(index.toLowerCase() == "sem") stop = true
                if(!stop) {
                    const start_from = (str, substring) => {
                        const index = str.indexOf(substring)
                        return index !== -1 ? str.substring(index + substring.length) : ''
                    }

                    const data_matkul = {}
                    const kode = td.length > 6 ? tag(td[2]).text().trim() : tag(td[1]).text().trim()
                    const nama = td.length > 6 ? tag(td[3]).text().trim() : tag(td[2]).text().trim()
                    const courses = td.length > 6 ? tag(td[4]).text().trim() : tag(td[3]).text().trim()
                    const sks = td.length > 6 ? tag(td[5]).text().trim() : tag(td[4]).text().trim()
                    const prasyarat = td.length > 6 ? tag(td[6]).text().trim() : tag(td[5]).text().trim()

                    const nama_final = nama.length > 50 ? start_from(nama, 'customEvent":"0"};').replace("\n", "") : nama

                    data_matkul["kode"] = kode
                    data_matkul["nama"] = nama_final
                    data_matkul["courses"] = courses
                    data_matkul["sks"] = sks
                    data_matkul["prasyarat"] = prasyarat

                    data.push(data_matkul)
                }
            }
        })

        return data
    } catch (error) {
        console.error("Terjadi error: ", error)
        return JSON.stringify({ error: `Terjadi error: ${error}` })
    }
}

const get_matkul_dtedi = (connection, callback) => {
    connection.query("SELECT * FROM last_scraped", (err, rows) => {
        if (err) {
            callback(null, {"Error": err})
        } else {
            const last_scraped = rows[0]
            const last_scraped_date = new Date(last_scraped["matkul_dtedi"])
            const current_date = new Date()
            const days_difference = Math.floor(get_days_difference(last_scraped_date, current_date))

            if(days_difference >= scrape_interval){
                const new_scraped_date = current_date.toISOString().slice(0, 19).replace('T', ' ')
                const old_scraped_date = last_scraped["matkul_dtedi"].toISOString().slice(0, 19).replace('T', ' ').split(" ")[0]
                connection.query(`UPDATE last_scraped SET matkul_dtedi = '${new_scraped_date}' WHERE matkul_dtedi LIKE '%${old_scraped_date}%'`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                })
                const data_matkul_dtedi = scrape_matkul_dtedi()

                connection.query(`DELETE FROM matkul_dtedi`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                  })

                data_matkul_dtedi.forEach(matkul => {
                    const kode = matkul["kode"] != null ? matkul["kode"].replace(/'/g, "\\'") : "" 
                    const nama = matkul["nama"] != null ? matkul["nama"].replace(/'/g, "\\'") : "" 
                    const sks = matkul["sks"] != null ? matkul["sks"].replace(/'/g, "\\'") : ""                     
                    
                    const insert_query = `INSERT INTO matkul_dtedi (kode, nama, sks) VALUES ('${kode}', '${nama}', '${sks}')`

                    connection.query(insert_query, (err, rows) => {
                        if (err) {
                            callback(null, {"Error": err})
                        }
                    })
                })

                callback(null, data_matkul_dtedi)
            } else {
                connection.query(`SELECT * FROM matkul_dtedi`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    } else {
                        callback(null, rows)
                    }
                  })
            }
        }
    })
}

const get_matkul_dteti = (connection, callback) => {
    connection.query("SELECT * FROM last_scraped", async (err, rows) => {
        if (err) {
            callback(null, {"Error": err})
        } else {
            const last_scraped = rows[0]
            const last_scraped_date = new Date(last_scraped["matkul_dteti"])
            const current_date = new Date()
            const days_difference = Math.floor(get_days_difference(last_scraped_date, current_date))

            if(days_difference >= scrape_interval){
                const new_scraped_date = current_date.toISOString().slice(0, 19).replace('T', ' ')
                const old_scraped_date = last_scraped["matkul_dteti"].toISOString().slice(0, 19).replace('T', ' ').split(" ")[0]
                connection.query(`UPDATE last_scraped SET matkul_dteti = '${new_scraped_date}' WHERE matkul_dteti LIKE '%${old_scraped_date}%'`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                })
                const data_matkul_dteti = await scrape_matkul_dteti()

                connection.query(`DELETE FROM matkul_dteti`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                  })

                data_matkul_dteti.forEach(matkul => {
                    const kode = matkul["kode"] != null ? matkul["kode"].replace(/'/g, "\\'") : "" 
                    const nama = matkul["nama"] != null ? matkul["nama"].replace(/'/g, "\\'") : "" 
                    const detail = matkul["detail"] != null ? matkul["detail"].replace(/'/g, "\\'") : "" 
                    const sks = matkul["sks"] != null ? matkul["sks"].replace(/'/g, "\\'") : "" 
                    const kriteria = matkul["kriteria"] != null ? matkul["kriteria"].replace(/'/g, "\\'") : "" 
                    
                    
                    const insert_query = `INSERT INTO matkul_dteti (kode, nama, detail, sks, kriteria) VALUES ('${kode}', '${nama}', '${detail}', '${sks}', '${kriteria}')`

                    connection.query(insert_query, (err, rows) => {
                        if (err) {
                            callback(null, {"Error": err})
                        }
                    })
                })

                callback(null, data_matkul_dteti)
            } else {
                connection.query(`SELECT * FROM matkul_dteti`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    } else {
                        callback(null, rows)
                    }
                  })
            }
        }
    })
}

const get_matkul_dike = (connection, callback) => {
    connection.query("SELECT * FROM last_scraped", async (err, rows) => {
        if (err) {
            callback(null, {"Error": err})
        } else {
            const last_scraped = rows[0]
            const last_scraped_date = new Date(last_scraped["matkul_dike"])
            const current_date = new Date()
            const days_difference = Math.floor(get_days_difference(last_scraped_date, current_date))

            if(days_difference >= scrape_interval){
                const new_scraped_date = current_date.toISOString().slice(0, 19).replace('T', ' ')
                const old_scraped_date = last_scraped["matkul_dike"].toISOString().slice(0, 19).replace('T', ' ').split(" ")[0]
                connection.query(`UPDATE last_scraped SET matkul_dike = '${new_scraped_date}' WHERE matkul_dike LIKE '%${old_scraped_date}%'`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                })
                const data_matkul_dike = await scrape_matkul_dike()

                connection.query(`DELETE FROM matkul_dike`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    }
                  })

                data_matkul_dike.forEach(matkul => {
                    const kode = matkul["kode"] != null ? matkul["kode"].replace(/'/g, "\\'") : "" 
                    const nama = matkul["nama"] != null ? matkul["nama"].replace(/'/g, "\\'") : "" 
                    const courses = matkul["courses"] != null ? matkul["courses"].replace(/'/g, "\\'") : "" 
                    const sks = matkul["sks"] != null ? matkul["sks"].replace(/'/g, "\\'") : "" 
                    const prasyarat = matkul["prasyarat"] != null ? matkul["prasyarat"].replace(/'/g, "\\'") : "" 
                    
                    
                    const insert_query = `INSERT INTO matkul_dike (kode, nama, courses, sks, prasyarat) VALUES ('${kode}', '${nama}', '${courses}', '${sks}', '${prasyarat}')`

                    connection.query(insert_query, (err, rows) => {
                        if (err) {
                            callback(null, {"Error": err})
                        }
                    })
                })

                callback(null, data_matkul_dike)
            } else {
                connection.query(`SELECT * FROM matkul_dike`, (err, rows) => {
                    if (err) {
                        callback(null, {"Error": err})
                    } else {
                        callback(null, rows)
                    }
                  })
            }
        }
    })
}

const get_matkul_dtedi_promise = util.promisify(get_matkul_dtedi)
const get_matkul_dteti_promise = util.promisify(get_matkul_dteti)
const get_matkul_dike_promise = util.promisify(get_matkul_dike)

const get_matkul_all = async (connection) => {
    try {
        const matkul_dtedi = await get_matkul_dtedi_promise(connection)
        const matkul_dteti = await get_matkul_dteti_promise(connection)
        const matkul_dike = await get_matkul_dike_promise(connection)

        return matkul_dtedi.concat(matkul_dteti, matkul_dike)
    } catch (error) {
        console.error("Terjadi error:", error)
        return []
    }
}


// jadwal kuliah simaster pdf to json

const get_jadwal_kuliah = async (pdf_buffer) => {
    try {
        const data = await pdf(pdf_buffer)
        const data_jadwal_kuliah = {}

        const raw_data = data.text.split("\n").filter(x => x)

        const universitas = raw_data[0]
        const fakultas = raw_data[1]
        const semester = raw_data[3]
        const jadwal_raw = raw_data.slice(8, -1)
        const kode_separator = jadwal_raw[0].slice(1, 5)
        const jadwal_processed = []
        let jadwal_temp = []

        for(let i = 0; i < jadwal_raw.length; i++){
            if((jadwal_raw[i].slice(1,5) == kode_separator) && i != 0){
                jadwal_processed.push(jadwal_temp)
                jadwal_temp = [jadwal_raw[i]]
            } else {
                jadwal_temp.push(jadwal_raw[i])
            }

        }
        jadwal_processed.push(jadwal_temp)

        const jadwal_final = []

        for(let i = 0; i < jadwal_processed.length; i++){
            const data_jadwal = {}
            const kode = jadwal_processed[i][0].slice(1).trim()+jadwal_processed[i][1].trim()
            const matkul = jadwal_processed[i][2].trim()
            const kelas = jadwal_processed[i][3].replace("Kelas: ", "").trim()
            const paket_semester = jadwal_processed[i][4][0]
            const sks = jadwal_processed[i][4][1]
            const dosen_jadwal = jadwal_processed[i].slice(4).join("")
            const dosen_jadwal_separator = dosen_jadwal.replace("Senin", "{-Separator-}").replace("Senin", "{-Separator-}").replace("Selasa", "{-Separator-}").replace("Rabu", "{-Separator-}").replace("Kamis", "{-Separator-}").replace("Jumat", "{-Separator-}").replace("Sabtu", "{-Separator-}").replace("Minggu", "{-Separator-}")
            const dosen_raw = dosen_jadwal.slice(2, dosen_jadwal_separator.search("{-Separator-}"))
            const pattern = /\b([A-Za-z])\.[A-Za-z]+\./g
            const dosen_processed = dosen_raw.replace(pattern, match => '%'.repeat(match.length))
            const dosen = []
            let dosen_separator = 0
            const jadwal = []
            const jadwal_waktu_pattern = /(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\b.*?(?=(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\b|$)/g
            const jadwal_waktu_raw = dosen_jadwal.slice(dosen_jadwal_separator.search("{-Separator-}"))
            const jadwal_waktu_processed = jadwal_waktu_raw.match(jadwal_waktu_pattern)
            

            for(let i = 0; i < dosen_processed.length; i++){
                if((dosen_processed[i] == "%") && (i != dosen_processed.length-1)){
                    if(/^[a-z]$/.test(dosen_processed[i+1].toLowerCase())){
                        dosen_separator = i
                        break
                    }
                }
            }
            for(let i = 0; i < jadwal_waktu_processed.length; i++){
                const jadwal_waktu_array = jadwal_waktu_processed[i].split(" ")
                const hari = jadwal_waktu_array[0].trim().replace(",", "")
                const jam = jadwal_waktu_array[1].trim()
                const ruang = jadwal_waktu_array.slice(3).join(" ")

                jadwal.push({
                    "hari": hari,
                    "jam": jam,
                    "ruang": ruang
                })
            }

            if(dosen_separator != 0){
                dosen.push(dosen_raw.slice(0, dosen_separator+1).replace(", ",  ",").split(",").join(", ").replace("  "," "))
                dosen.push(dosen_raw.slice(dosen_separator+1).replace(", ",  ",").split(",").join(", ").replace("  "," "))
            } else {
                dosen.push(dosen_raw.replace(", ",  ",").split(",").join(", ").replace("  "," "))
            }

            data_jadwal["kode"] = kode
            data_jadwal["matkul"] = matkul
            data_jadwal["kelas"] = kelas
            data_jadwal["paket semester"] = paket_semester
            data_jadwal["sks"] = sks
            data_jadwal["dosen"] = dosen
            data_jadwal["jadwal"] = jadwal

            jadwal_final.push(data_jadwal)
        }


        data_jadwal_kuliah["universitas"] = universitas
        data_jadwal_kuliah["fakultas"] = fakultas
        data_jadwal_kuliah["semester"] = semester
        data_jadwal_kuliah["jadwal kuliah"] = jadwal_final

        return data_jadwal_kuliah
    } catch (error) {
        throw error
    }
}


app.get("/", (req, res) => {
    res.send("Hello, world! bjir")
})

app.get("/api/dosen", async (req, res) => {
    try {
        const data_dosen_all = await get_dosen_all(connection)
        res.send(data_dosen_all)
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.get("/api/dosen/dtedi", (req, res) => {
    try {
        get_dosen_dtedi(connection, (error, data_dosen_dtedi) => {
            if (error) {
                console.error("Error in API route:", error)
                res.status(500).send({ error: "Internal Server Error" })
            } else {
                res.send(data_dosen_dtedi)
            }
        })
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.get("/api/dosen/dteti", (req, res) => {
    try {
        get_dosen_dteti(connection, (error, data_dosen_dteti) => {
            if (error) {
                console.error("Error in API route:", error)
                res.status(500).send({ error: "Internal Server Error" })
            } else {
                res.send(data_dosen_dteti)
            }
        })
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.get("/api/dosen/dike", (req, res) => {
    try {
        get_dosen_dike(connection, (error, data_dosen_dike) => {
            if (error) {
                console.error("Error in API route:", error)
                res.status(500).send({ error: "Internal Server Error" })
            } else {
                res.send(data_dosen_dike)
            }
        })
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.get("/api/matkul", async (req, res) => {
    try {
        const data_matkul_all = await get_matkul_all(connection)
        res.send(data_matkul_all)
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.get("/api/matkul/dtedi", (req, res) => {
    try {
        get_matkul_dtedi(connection, (error, data_matkul_dtedi) => {
            if (error) {
                console.error("Error in API route:", error)
                res.status(500).send({ error: "Internal Server Error" })
            } else {
                res.send(data_matkul_dtedi)
            }
        })
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.get("/api/matkul/dteti", (req, res) => {
    try {
        get_matkul_dteti(connection, (error, data_matkul_dteti) => {
            if (error) {
                console.error("Error in API route:", error)
                res.status(500).send({ error: "Internal Server Error" })
            } else {
                res.send(data_matkul_dteti)
            }
        })
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.get("/api/matkul/dike", (req, res) => {
    try {
        get_matkul_dike(connection, (error, data_matkul_dike) => {
            if (error) {
                console.error("Error in API route:", error)
                res.status(500).send({ error: "Internal Server Error" })
            } else {
                res.send(data_matkul_dike)
            }
        })
    } catch (error) {
        console.error("Error in API route:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})

app.post("/api/jadwalsimaster", upload.single("jadwal_pdf"), async (req, res) => {
    if(!req.file) {
        return res.send({"error": "No file uploaded."})
      }
    if(req.file.mimetype != "application/pdf"){
        return res.send({"error": "File must be pdf. Download it in simaster app -> akademik -> jadwal kuliah -> cetak jadwal kuliah"})
    }

    const metadata = {}

    metadata["original_name"] = req.file.originalname
    metadata["size"] = req.file.size
    metadata["mime_type"] = req.file.mimetype

    const pdf_data = await get_jadwal_kuliah(req.file.buffer)

    res.send(pdf_data)
})

app.get("/testapijadwalsimaster", (req, res) => {
    const html = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Testing api jadwalsimaster</title>
</head>
<body>
    <h1>Testing api jadwalsimaster</h1>
    <input type="file" id="file_input" />
    <button onclick="upload_file()">Upload File</button>
    <br/>
    <h2>Api output</h2>
    <br/>
    <div id="api_output"></div>

    <script>
        function upload_file() {
            const file_input = document.getElementById('file_input')
            const file = file_input.files[0]

            if (!file) {
                console.error('No file selected.')
                return
            }

            const url = 'http://localhost:3000/api/jadwalsimaster'

            const formData = new FormData()
            formData.append('jadwal_pdf', file)

            fetch(url, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("HTTP error! Status: "+response.status)
                }
                return response.text()
            })
            .then(data => {
                const api_output = document.getElementById('api_output')
                api_output.textContent = data
            })
            .catch(error => {
                console.error('Error:', error)
            })
        }
    </script>
</body>
</html>
    `
    return res.send(html)
})

app.get("")

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`)
})
