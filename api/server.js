var ObjectID = require('mongodb').ObjectId;
var express = require('express'),
    bodyParser = require('body-parser'),
    mongodb = require('mongodb'),
    multiparty = require('connect-multiparty'),
    fs = require('fs');

var app = express();

// body-parser
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(multiparty());

/* Middleware para pré-configurar o response */
app.use(function(req, res, next) {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"); // verbos http habilitados
    res.setHeader("Access-Control-Allow-Headers", "Content-type"); // habilita reescritura de cabeçalhos para determinada chave
    res.setHeader("Access-Control-Allow-Credentials", true);

    next(); //continua o fluxo
});

var port = 8090;

app.listen(port, function() {
    console.log('Servidor HTTP esta escutando na porta ' + port);
});

var db = new mongodb.Db(
    'instagram',
    new mongodb.Server('localhost', 27017, {}), {}
);

app.get('/', function(req, res) {
    res.send({
        msg: 'Olá'
    });
});

// POST(create)
app.post('/api', function(req, res) {

    var date = new Date();
    var time_stmp = date.getTime();

    var url_imagem = time_stmp + '_' + req.files.arquivo.originalFilename;

    var path_origem = req.files.arquivo.path;
    var path_destino = './uploads/' + url_imagem;

    // Move o arquivo para a pasta de destino.
    fs.rename(path_origem, path_destino, function(err) {
        if (err) {
            res.status(500).json({
                error: err
            });
            return;
        }
        var dados = {
            url_image: url_imagem,
            titulo: req.body.titulo,
        }

        db.open(function(err, mongoclient) {
            mongoclient.collection('postagens', function(err, collection) {
                collection.insert(dados, function(err, records) {
                    if (err) {
                        res.json({
                            'status': 'erro'
                        });
                    } else {
                        res.json({
                            'status': 'inclusao realizada com sucesso'
                        });
                    }
                    mongoclient.close();
                });
            });
        });
    });
});

// GET(ready)
app.get('/api', function(req, res) {

    db.open(function(err, mongoclient) {
        mongoclient.collection('postagens', function(err, collection) {
            collection.find().toArray(function(err, results) {
                if (err) {
                    res.json(err);
                } else {
                    res.json(results);
                }
                mongoclient.close();
            });
        });
    });
});

app.get('/imagens/:imagem', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    var img = req.params.imagem;

    fs.readFile('./uploads/' + img, function(err, content) {
        if (err) {
            res.status(404).json(err);
            return;
        }
        res.writeHead(
            // Cria o cabeçalho
            200, {
                'Content-type': 'image/jpg'
            }
        );
        // escreve o binário
        res.end(content);

    });

});

// GET by ID (ready)
app.get('/api/:id', function(req, res) {
    db.open(function(err, mongoclient) {
        mongoclient.collection('postagens', function(err, collection) {
            collection.find(ObjectID(req.params.id)).toArray(function(err, results) {
                if (err) {
                    res.json(err);
                } else {
                    res.statusCode(200).json(results); // incluir o status dentro da resposta
                }
                mongoclient.close();
            });
        });
    });
});


// PUT by ID (UPDATE)
app.put('/api/:id', function(req, res) {

    db.open(function(err, mongoclient) {
        mongoclient.collection('postagens', function(err, collection) {
            collection.update({
                    _id: ObjectID(req.params.id)
                }, {
                    $push: { // chave que será criada
                        comentarios:
                        // campos que serão criados dentro da chave
                        {
                            id_comentario: new ObjectID(), // cria um identificador único para o comentário
                            comentario: req.body.comentario // adiciona o comentário recebido da requisição
                        }
                    }
                }, // inclui um elemento dentro do array
                {},
                function(err, data) {
                    if (err) {
                        res.json(err);
                    } else {
                        res.json(data);
                    };
                });
            mongoclient.close();
        });
    });
});

// DELETE by ID (DELETE)
app.delete('/api/:id', function(req, res) {
    // remove apenas os comentários
    db.open(function(err, mongoclient) {
        mongoclient.collection('postagens', function(err, collection) {
            collection.update({},
                // operação quer será realizada
                {
                    $pull: {
                        // critério de pesquisa dentro do mongo
                        comentarios: {
                            id_comentario: ObjectID(req.params.id)
                        }
                    }
                }, {
                    multi: true
                }, // permite a exclusão em mais de um documento
                function(err, data) {
                    if (err) {
                        res.json(err);
                    } else {
                        res.json(data);
                    };
                    mongoclient.close();
                });
        });
    });

});
