import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { Card, ClientUpdate, GameState } from "@shared/types";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Navbar from "react-bootstrap/Navbar";
import Row from "react-bootstrap/Row";
import Stack from "react-bootstrap/Stack";
import Table from "react-bootstrap/Table";

function CardList({
  cards,
  canClick,
  onClick,
}: {
  cards: Card[];
  canClick: boolean;
  onClick: (card: Card) => void;
}) {
  return (
    <dl>
      {cards.map((card) => (
        <>
          <dt>
            {canClick ? (
              <a href="#" onClick={() => onClick(card)}>
                {card.name}
              </a>
            ) : (
              card.name
            )}
          </dt>
          <dd>{card.definition}</dd>
        </>
      ))}
    </dl>
  );
}

export default function App() {
  const [socketUrl, setSocketUrl] = useState("ws://127.0.0.1:8080");
  const [state, setState] = useState<GameState>();

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  function send(data: ClientUpdate) {
    sendMessage(JSON.stringify(data));
  }

  useEffect(() => {
    if (lastMessage !== null) {
      setState(JSON.parse(lastMessage.data));
    }
  }, [lastMessage]);

  const game = state?.game;
  const me = game?.players.find((p) => p.id === state?.id);
  const canplay = !me?.played && !me?.judge && game?.state === "Playing";
  const judge = !!(me?.judge && game?.state === "Judging");
  const last = game?.last;

  function handleJudge(card: Card) {
    send({ pick: card });
  }

  function handlePlay(card: Card) {
    send({ play: card });
  }

  function handleName(name: string) {
    send({ name });
  }

  return (
    <>
      <Navbar
        variant="light"
        expand="lg"
        className="justify-content-between"
        bg="light"
      >
        <Container fluid>
          <Navbar.Brand href="#">Apples to Apples</Navbar.Brand>
        </Container>
      </Navbar>

      {game && (
        <Container fluid>
          <Row>
            <Col>
              <Stack>
                {game.adjective && (
                  <Alert variant="success" className="m-2">
                    <strong>{game.adjective.name}</strong> -{" "}
                    {game.adjective.definition}
                  </Alert>
                )}
                {game.cards && (
                  <div className="m-2">
                    <h4>Cards to judge</h4>
                    <CardList
                      cards={game.cards}
                      canClick={judge}
                      onClick={handleJudge}
                    />
                  </div>
                )}
                <div className="m-2">
                  <h4>Your hand</h4>
                  <CardList
                    cards={state.hand}
                    canClick={canplay}
                    onClick={handlePlay}
                  />
                </div>
              </Stack>
            </Col>
            <Col>
              <Stack>
                <div className="m-2">
                  <Form.Control
                    placeholder="Name"
                    value={me?.name}
                    onChange={(e) => {
                      handleName(e.target.value);
                    }}
                  />
                </div>
                <div className="m-2">
                  <ul>
                    <li>
                      <strong>State:</strong> {game.state}
                    </li>
                    {last && (
                      <li>
                        <strong>Last round:</strong>
                        <ul>
                          <li>
                            <strong>Judge:</strong> - {last.judge.name}
                          </li>
                          <li>
                            <strong>Adjective:</strong> {last.adjective.name}{" "}
                            &mdash;
                            {last.adjective.definition}
                          </li>
                          <li>
                            <strong>Winner:</strong> {last.winner.name}
                          </li>
                          <li>
                            <strong>Noun:</strong> {last.noun.name} &mdash;
                            {last.noun.definition}
                          </li>
                        </ul>
                      </li>
                    )}
                  </ul>
                </div>
                <div className="m-2">
                  <Table bordered>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.players.map((player) => (
                        <tr>
                          <td>
                            {player.name}{" "}
                            {me === player && <Badge bg="primary">You</Badge>}{" "}
                            {player.judge && (
                              <Badge bg="secondary">Judge</Badge>
                            )}{" "}
                            {player.played && (
                              <Badge bg="success">Played</Badge>
                            )}
                          </td>
                          <td>{player.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Stack>
            </Col>
          </Row>
        </Container>
      )}
    </>
  );
}
